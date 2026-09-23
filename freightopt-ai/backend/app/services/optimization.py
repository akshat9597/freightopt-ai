from datetime import date, timedelta
from app.config import DEMO_DATE, USD_INR
from app.services.catalog import (
    PORT_BY_NAME,
    VESSELS,
    VESSEL_BY_NAME,
    DESTINATIONS,
    ROUTE_MAP,
    market_state,
)


def risk_label(score):
    return (
        "CRITICAL"
        if score >= 80
        else "HIGH"
        if score >= 60
        else "MEDIUM"
        if score >= 35
        else "LOW"
    )


def check_port_compatibility(vessel, port):
    checks = []
    reasons = []
    for label, attribute, limit in [
        ("Draft", "laden_draft", "max_draft"),
        ("LOA", "typical_loa", "max_loa"),
        ("Beam", "beam", "max_beam"),
    ]:
        passed = vessel[attribute] <= port[limit]
        checks.append(
            dict(
                parameter=label,
                vessel_value=vessel[attribute],
                port_limit=port[limit],
                passed=passed,
            )
        )
        if not passed:
            reasons.append(
                f"{label} exceeds {port['name']} limit by {vessel[attribute] - port[limit]:.1f}m ({vessel[attribute]:.1f}m vs {port[limit]:.1f}m)."
            )
    return dict(
        port=port["name"],
        compatible=not reasons,
        status="COMPATIBLE" if not reasons else "INCOMPATIBLE",
        reasons=reasons or ["Draft, LOA and beam satisfy representative port limits."],
        checks=checks,
    )


def voyage_timing(request, vessel, overrides=None):
    overrides = overrides or {}
    o = PORT_BY_NAME[request.origin_port]
    d = PORT_BY_NAME[request.destination_port]
    congestion = overrides.get("destination_congestion", d["congestion_index"])
    destination_wait = d["average_waiting_days"] * (0.35 + 1.3 * congestion / 100)
    origin_wait = o["average_waiting_days"] * (0.35 + 1.3 * o["congestion_index"] / 100)
    weather = overrides.get("weather", "normal")
    delay = {"normal": 0, "rough weather": 1.5, "cyclone risk": 4, "high swell": 2}[
        weather
    ]
    sailing = ROUTE_MAP[o["name"], d["name"]]["distance_nm"] / (
        vessel["speed_knots"] * 24
    )
    loading = request.cargo_quantity / o["handling_rate"]
    discharge = request.cargo_quantity / d["handling_rate"]
    idle_score = min(100, (destination_wait + origin_wait) * 12 + delay * 9)
    return {
        k: round(v, 2) if isinstance(v, float) else v
        for k, v in dict(
            loading_days=loading,
            sailing_days=sailing,
            discharge_days=discharge,
            origin_waiting_days=origin_wait,
            destination_waiting_days=destination_wait,
            port_waiting_days=origin_wait + destination_wait,
            potential_idle_days=delay,
            weather_delay_days=delay,
            weather=weather,
            total_days=sailing
            + loading
            + discharge
            + origin_wait
            + destination_wait
            + delay,
            port_turnaround_days=loading + discharge + origin_wait + destination_wait,
            idle_risk_score=idle_score,
            idle_risk=risk_label(idle_score),
        ).items()
    }


def cost_estimate(request, vessel, rate, overrides=None, optimized=False):
    overrides = overrides or {}
    timing = voyage_timing(request, vessel, overrides)
    fuel = overrides.get(
        "fuel_price_usd", market_state(date.fromisoformat(DEMO_DATE))["fuel_price_usd"]
    )
    # Quote is linehaul including sea fuel; port, waiting and weather idle are additional.
    freight = rate * request.cargo_quantity
    fuel_estimate = timing["sailing_days"] * vessel["fuel_tonnes_day"] * fuel
    ports = (
        PORT_BY_NAME[request.origin_port]["port_charges_usd"]
        + PORT_BY_NAME[request.destination_port]["port_charges_usd"]
    )
    waiting = timing["port_waiting_days"] * vessel["daily_charter_cost"]
    idle = timing["potential_idle_days"] * vessel["daily_charter_cost"]
    total = freight + ports + waiting + idle
    return dict(
        freight_cost=round(freight, 2),
        fuel_estimate=round(fuel_estimate, 2),
        port_charges=ports,
        waiting_cost=round(waiting, 2),
        idle_cost=round(idle, 2),
        commitment_cost=0,
        total=round(total, 2),
        cost_per_tonne=round(total / request.cargo_quantity, 3),
        note="Per-voyage USD estimate. Linehaul freight includes sea fuel; fuel shown for information only and is NOT added again. Waiting is port queue time; idle is additional simulated weather delay. Landside transport, duties, insurance and cargo value excluded.",
    )


def contract_discount(request):
    # Demonstration procurement discounts, not broker quotations or time-charter hire.
    maximum = {
        "Spot": 0,
        "Short-Term": 0.018,
        "Medium-Term": 0.03,
        "Multi-Voyage": 0.04,
    }[request.contract_type]
    return maximum * min(1, request.contract_duration_days / 60)


def recommend_vessel(request, forecaster, day=None, overrides=None, optimized=False):
    day = day or date.fromisoformat(DEMO_DATE)
    overrides = overrides or {}
    predictions = forecaster.predict_many(
        request, [v["name"] for v in VESSELS], [day], overrides
    )
    rows = []
    for vessel in VESSELS:
        checks = [
            check_port_compatibility(vessel, PORT_BY_NAME[p])
            for p in [request.origin_port, request.destination_port]
        ]
        reasons = [
            reason for c in checks if not c["compatible"] for reason in c["reasons"]
        ]
        utilization = request.cargo_quantity / vessel["cargo_capacity_tonnes"]
        if utilization > 1:
            reasons.append(
                f"Cargo exceeds conservative {vessel['cargo_capacity_tonnes']:,}t capacity (90% of maximum DWT). Split cargo or select a larger compatible vessel."
            )
        if utilization < 0.25:
            reasons.append(
                f"Only {utilization:.0%} utilization; below 25% minimum for this single-vessel plan."
            )
        if request.cargo_type not in vessel["cargo_suitability"]:
            reasons.append("Cargo type unsuitable.")
        timing = voyage_timing(request, vessel, overrides)
        rate = predictions[vessel["name"]][0]["predicted_rate"] * (
            1 - contract_discount(request) if optimized else 1
        )
        costs = (
            cost_estimate(request, vessel, rate, overrides, optimized)
            if not reasons
            else None
        )
        rows.append(
            dict(
                vessel=vessel["name"],
                compatible=not reasons,
                reasons=reasons
                or ["Port dimensions and cargo capacity pass all checks."],
                estimated_cost=costs["total"] if costs else None,
                utilization=round(utilization * 100, 1),
                risk=timing["idle_risk"] if not reasons else "CRITICAL",
                score=0,
                rate=round(rate, 3) if costs else None,
                compatibility=checks,
                timing=timing,
                costs=costs,
            )
        )
    compatible = [r for r in rows if r["compatible"]]
    minimum = min([r["estimated_cost"] for r in compatible], default=1)
    for row in compatible:
        row["score"] = round(
            65 * minimum / row["estimated_cost"]
            + 25 * min(100, row["utilization"]) / 100
            + 10 * (1 - row["timing"]["idle_risk_score"] / 100),
            1,
        )
    return sorted(rows, key=lambda r: (not r["compatible"], -r["score"]))


def alternatives(request, forecaster, requested_cost, requested_timing, overrides=None):
    results = []
    for dest in DESTINATIONS:
        if dest["name"] == request.destination_port:
            continue
        alternative = request.model_copy(update={"destination_port": dest["name"]})
        alt_overrides = {
            k: v for k, v in (overrides or {}).items() if k != "destination_congestion"
        }
        ranked = recommend_vessel(
            alternative, forecaster, request.start_date, alt_overrides, True
        )
        best = next((r for r in ranked if r["compatible"]), None)
        if not best:
            continue
        results.append(
            dict(
                port=dest["name"],
                vessel=best["vessel"],
                compatible=True,
                distance_nm=ROUTE_MAP[request.origin_port, dest["name"]]["distance_nm"],
                freight_rate=best["rate"],
                congestion=dest["congestion_index"],
                handling_rate=dest["handling_rate"],
                estimated_total_cost=best["estimated_cost"],
                saving_percent=round(
                    100 * (requested_cost - best["estimated_cost"]) / requested_cost, 2
                )
                if requested_cost
                else None,
                turnaround_improvement_days=round(
                    requested_timing - best["timing"]["port_turnaround_days"], 2
                )
                if requested_timing is not None
                else None,
                waiting_days=best["timing"]["destination_waiting_days"],
            )
        )
    return sorted(results, key=lambda r: r["estimated_total_cost"])[:3]


def optimize(request, forecaster, overrides=None, include_alternatives=True):
    overrides = overrides or {}
    as_of = date.fromisoformat(DEMO_DATE)
    market = {**market_state(as_of), **overrides}
    o = PORT_BY_NAME[request.origin_port]
    d = PORT_BY_NAME[request.destination_port]
    congestion = overrides.get("destination_congestion", d["congestion_index"])
    current = recommend_vessel(request, forecaster, as_of, overrides)
    feasible = next((r for r in current if r["compatible"]), None)
    assumptions = [
        "All figures are synthetic or representative demonstration data.",
        "One vessel / one voyage. Conservative capacity is 90% of maximum DWT. Full laden draft checked; no tidal windows or part-load draft relaxation.",
        "Booking can move up to 14 days after desired start, within the 90-day demo horizon. Rates are scenario-conditioned model estimates.",
        "Contract duration affects a simulated procurement discount, not continuous time-charter hire. Multi-Voyage figures are per voyage; no volume commitment is priced.",
        "No landside switching cost is included for alternative ports; confirm cargo reception, permits and inland logistics.",
        "Confidence is a heuristic reliability score, not probability of savings.",
    ]
    base = dict(
        feasible=bool(feasible),
        recommendation="HIGH-RISK MARKET",
        opportunity_score=0,
        recommended_vessel=None,
        recommended_booking_date=None,
        charter_window_end=None,
        forecast_rate=None,
        estimated_total_cost=None,
        potential_saving=0,
        saving_percent=0,
        confidence=0,
        risk="CRITICAL",
        reasons=[],
        vessel_comparison=current,
        forecast=[],
        alerts=[],
        spot_cost=None,
        optimized_cost=None,
        risk_factors=[],
        score_breakdown=[],
        alternatives=[],
        timing={},
        voyage=request.model_dump(mode="json"),
        market=market,
        currency={
            "usd_inr": USD_INR,
            "source": "Configurable demo conversion; not live",
        },
        assumptions=assumptions,
    )
    if not feasible:
        base["reasons"] = [
            "No vessel satisfies both port infrastructure and single-vessel cargo capacity constraints. No booking recommended. Review an alternative port or change the cargo lot size."
        ]
        base["alerts"] = [
            dict(
                id="no-vessel",
                title="No compatible vessel",
                detail="All four vessel classes were rejected. See the dimensional and capacity checks below.",
                severity="CRITICAL",
                source="Simulation",
            )
        ]
        base["risk_factors"] = [
            dict(
                name="Infrastructure Risk",
                score=100,
                level="CRITICAL",
                explanation="No feasible vessel for the requested cargo and port pair.",
            )
        ]
        if include_alternatives:
            base["alternatives"] = alternatives(
                request, forecaster, None, None, overrides
            )
        return base
    days = [
        request.start_date + timedelta(days=i)
        for i in range(min(14, 90 - (request.start_date - as_of).days) + 1)
    ]
    names = [r["vessel"] for r in current if r["compatible"]]
    predicted = forecaster.predict_many(request, names, days, overrides)
    options = []
    for name in names:
        for point in predicted[name]:
            rate = point["predicted_rate"] * (1 - contract_discount(request))
            costs = cost_estimate(request, VESSEL_BY_NAME[name], rate, overrides, True)
            options.append((costs["total"], point["date"], name, rate, costs))
    _, booking, name, rate, costs = min(options, key=lambda t: t[0])
    booking_date = date.fromisoformat(booking)
    ranking = recommend_vessel(request, forecaster, booking_date, overrides, True)
    # Final ranking uses the same feasibility filters and explainable utility score.
    best = next(r for r in ranking if r["compatible"])
    name = best["vessel"]
    costs = best["costs"]
    rate = best["rate"]
    # Optimize date again for the selected vessel, keeping ranking and recommendation consistent.
    point = min(predicted[name], key=lambda p: p["predicted_rate"])
    booking_date = date.fromisoformat(point["date"])
    booking = point["date"]
    ranking = recommend_vessel(request, forecaster, booking_date, overrides, True)
    best = next(r for r in ranking if r["vessel"] == name)
    costs = best["costs"]
    rate = best["rate"]
    series = forecaster.forecast(request, name, overrides)["points"]
    spot = next(r for r in current if r["compatible"])["costs"]
    savings = spot["total"] - costs["total"]
    saving_percent = savings / spot["total"] * 100
    rate_change = (series[30]["predicted_rate"] / series[0]["predicted_rate"] - 1) * 100
    uncertainty = (point["upper_bound"] - point["lower_bound"]) / (
        2 * point["predicted_rate"]
    )
    weather_score = {
        "normal": 0,
        "rough weather": 40,
        "cyclone risk": 95,
        "high swell": 60,
    }[overrides.get("weather", "normal")]
    risk_scores = [
        (
            "Freight Rate Volatility",
            min(100, market["market_volatility"] * 330),
            "Simulated daily market variation.",
        ),
        (
            "Fuel Price Risk",
            min(100, max(0, (market["fuel_price_usd"] - 350) / 8)),
            "Higher bunker prices increase voyage exposure.",
        ),
        (
            "Port Congestion Risk",
            max(congestion, o["congestion_index"]),
            "Maximum loading/discharge congestion index.",
        ),
        (
            "Demand Risk",
            min(100, market["baltic_index"] / 35),
            "Synthetic market index as a demand proxy.",
        ),
        (
            "Infrastructure Risk",
            15,
            "All three dimensional checks passed; official limits still require verification.",
        ),
        (
            "Forecast Uncertainty",
            min(100, uncertainty * 220),
            "Residual spread relative to the predicted freight rate.",
        ),
        (
            "Weather Disruption",
            weather_score,
            "Simulated weather scenario; no weather feed connected.",
        ),
    ]
    overall = min(
        100,
        round(
            sum(s for _, s, _ in risk_scores) / len(risk_scores) * 0.7
            + max(s for _, s, _ in risk_scores) * 0.3
        ),
    )
    contributions = [
        dict(factor="Base opportunity", value=50, detail="Neutral starting score"),
        dict(
            factor="Projected savings",
            value=round(max(-20, min(25, saving_percent * 3))),
            detail=f"{saving_percent:+.1f}% versus current spot",
        ),
        dict(
            factor="Port congestion",
            value=round((50 - congestion) * 0.22),
            detail=f"{congestion:.0f}/100 at destination",
        ),
        dict(
            factor="Market volatility",
            value=-round(market["market_volatility"] * 35),
            detail=f"{market['market_volatility']:.1%} simulated variation",
        ),
        dict(
            factor="Forecast uncertainty",
            value=-round(uncertainty * 35),
            detail=f"±{uncertainty:.1%} relative interval",
        ),
        dict(
            factor="Vessel utilization",
            value=round(best["utilization"] * 0.16),
            detail=f"{best['utilization']:.1f}% cargo utilization",
        ),
        dict(
            factor="Market index pressure",
            value=round(max(-8, min(8, (1800 - market["baltic_index"]) / 120))),
            detail=f"{market['baltic_index']:,.0f} simulated index",
        ),
    ]
    raw_score = sum(c["value"] for c in contributions)
    opportunity = max(0, min(100, raw_score))
    if raw_score != opportunity:
        contributions.append(
            dict(
                factor="Score bounds",
                value=opportunity - raw_score,
                detail="Keep final opportunity between 0 and 100",
            )
        )
    wait_days = (booking_date - request.start_date).days
    entry_rate = predicted[name][0]["predicted_rate"]
    decline = (entry_rate - point["predicted_rate"]) / entry_rate
    signal = (
        "HIGH-RISK MARKET"
        if overall >= 65 or weather_score >= 80
        else "WAIT"
        if wait_days >= 2 and decline > 0.015
        else "BOOK NOW"
        if rate_change > 2 or opportunity >= 78
        else "MONITOR"
    )
    if signal != "WAIT":
        booking_date = request.start_date
        booking = booking_date.isoformat()
        ranking = recommend_vessel(request, forecaster, booking_date, overrides, True)
        best = next(r for r in ranking if r["compatible"])
        name = best["vessel"]
        rate = best["rate"]
        costs = best["costs"]
        series = forecaster.forecast(request, name, overrides)["points"]
        savings = spot["total"] - costs["total"]
        saving_percent = savings / spot["total"] * 100
        contributions[1].update(
            value=round(max(-20, min(25, saving_percent * 3))),
            detail=f"{saving_percent:+.1f}% versus current spot",
        )
        contributions = [c for c in contributions if c["factor"] != "Score bounds"]
        raw_score = sum(c["value"] for c in contributions)
        opportunity = max(0, min(100, raw_score))
        if raw_score != opportunity:
            contributions.append(
                dict(
                    factor="Score bounds",
                    value=opportunity - raw_score,
                    detail="Score clipped to 0–100",
                )
            )
    # The timing engine may return to the requested date for MONITOR/BOOK NOW.
    # Recompute confidence, explanations and score against that final decision.
    final_point = next(p for p in series if p["date"] == booking)
    uncertainty = (final_point["upper_bound"] - final_point["lower_bound"]) / (
        2 * final_point["predicted_rate"]
    )
    rate_change = (series[30]["predicted_rate"] / series[0]["predicted_rate"] - 1) * 100
    risk_scores = [
        (
            n,
            min(100, uncertainty * 220) if n == "Forecast Uncertainty" else value,
            explanation,
        )
        for n, value, explanation in risk_scores
    ]
    overall = min(
        100,
        round(
            sum(value for _, value, _ in risk_scores) / len(risk_scores) * 0.7
            + max(value for _, value, _ in risk_scores) * 0.3
        ),
    )
    contributions = [c for c in contributions if c["factor"] != "Score bounds"]
    for component in contributions:
        if component["factor"] == "Forecast uncertainty":
            component.update(
                value=-round(uncertainty * 35),
                detail=f"±{uncertainty:.1%} relative interval at selected booking date",
            )
        elif component["factor"] == "Vessel utilization":
            component.update(
                value=round(best["utilization"] * 0.16),
                detail=f"{best['utilization']:.1f}% cargo utilization",
            )
    raw_score = sum(c["value"] for c in contributions)
    opportunity = max(0, min(100, raw_score))
    if raw_score != opportunity:
        contributions.append(
            dict(
                factor="Score bounds",
                value=opportunity - raw_score,
                detail="Keep opportunity between 0 and 100",
            )
        )
    if signal != "WAIT":
        signal = (
            "HIGH-RISK MARKET"
            if overall >= 65 or weather_score >= 80
            else "BOOK NOW"
            if rate_change > 2 or opportunity >= 78
            else "MONITOR"
        )
    reasons = [
        f"{name} carries {request.cargo_quantity:,.0f}t at {best['utilization']:.1f}% utilization and passes draft, LOA and beam checks at {request.origin_port} and {request.destination_port}.",
        f"The {name} route scenario changes {rate_change:+.1f}% over 30 days. "
        + (
            f"Waiting {(booking_date - request.start_date).days} days after your desired start gives a lower estimated linehaul rate."
            if signal == "WAIT"
            else "The displayed booking date is your requested start; monitor signals are provisional, not an instruction to fix."
            if signal in ["MONITOR", "HIGH-RISK MARKET"]
            else "Reserve at the earliest requested start in this planning scenario."
        ),
        f"Expected destination waiting is {best['timing']['destination_waiting_days']:.1f} days; estimated total voyage is {best['timing']['total_days']:.1f} days.",
        f"{request.contract_type} receives a {contract_discount(request):.2%} simulated per-voyage procurement discount for a {request.contract_duration_days}-day planning term.",
    ]
    if (
        request.contract_duration_days < best["timing"]["total_days"]
        and request.contract_type != "Spot"
    ):
        reasons.append(
            "Warning: planning term is shorter than estimated voyage duration; extend the term before committing."
        )
    alerts = []
    if congestion >= 60:
        alerts.append(
            dict(
                id="congestion",
                title=f"High congestion at {d['name']}",
                detail=f"Congestion index {congestion:.0f}/100. Compare alternative discharge ports.",
                severity="HIGH",
                source="Simulation",
            )
        )
    if savings > 0:
        alerts.append(
            dict(
                id="opportunity",
                title="Potential charter opportunity detected",
                detail=f"Estimated {saving_percent:.1f}% saving versus the current compatible spot option.",
                severity="LOW",
                source="Simulation",
            )
        )
    if weather_score:
        alerts.append(
            dict(
                id="weather",
                title=f"Simulated {overrides['weather']}",
                detail=f"Adds {best['timing']['weather_delay_days']} idle days; confirm weather routing before chartering.",
                severity=risk_label(weather_score),
                source="Simulation",
            )
        )
    base.update(
        recommendation=signal,
        opportunity_score=opportunity,
        recommended_vessel=name,
        recommended_booking_date=booking,
        charter_window_end=min(
            booking_date + timedelta(days=3), as_of + timedelta(days=90)
        ).isoformat(),
        forecast_rate=rate,
        estimated_total_cost=costs["total"],
        potential_saving=round(savings, 2),
        saving_percent=round(saving_percent, 2),
        confidence=round(max(0.15, min(0.95, 1 - uncertainty - overall / 400)), 3),
        risk=risk_label(overall),
        reasons=reasons,
        vessel_comparison=ranking,
        forecast=series,
        alerts=alerts,
        spot_cost=spot,
        optimized_cost=costs,
        risk_factors=[
            dict(name=n, score=round(s), level=risk_label(s), explanation=e)
            for n, s, e in risk_scores
        ],
        score_breakdown=contributions,
        timing=best["timing"],
    )
    if include_alternatives:
        base["alternatives"] = alternatives(
            request,
            forecaster,
            costs["total"],
            best["timing"]["port_turnaround_days"],
            overrides,
        )
    return base
