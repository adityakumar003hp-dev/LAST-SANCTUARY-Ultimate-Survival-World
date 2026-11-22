# Railway Clearance, Electrification & Seven-Car Train Update

- Railway right-of-way is reserved from z=136 through z=224, including the six-track corridor and a safety margin.
- Procedural harvestables (trees, rocks, scrap and bushes) are rejected inside the railway reserve.
- Ground-grass tufts are also excluded from the reserve.
- Wildlife spawn attempts inside the reserve are rejected; roaming wildlife is redirected before it enters the reserve.
- Railway chunks include overhead catenary wires, steel support masts, crossarms and insulators.
- Every train is built as seven connected vehicles: one powered lead car plus six passenger coaches.
- Each passenger coach includes a floor, underframe, walls, end bulkheads, roof, windows, passenger seating and bogies/wheels.
- Train bounding/collision proxy is extended to cover the complete seven-car consist.

Validation note: source-level edits are complete. Full TypeScript production build and Android gameplay/collision testing must still be run in the target development environment.
