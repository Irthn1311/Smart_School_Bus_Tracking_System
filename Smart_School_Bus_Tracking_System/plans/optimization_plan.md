# Route Optimization Plan

## Current Implementation Analysis
The current system uses a **Sector-Based Approach**:
1.  **Sectoring**: Divides students into 8 fixed sectors (N, NE, E, SE, S, SW, W, NW) based on bearing from SGU University.
2.  **Clustering**: Inside each sector, it uses a greedy clustering algorithm to group students into stops.
3.  **Routing**: Routes are formed by simply filling up capacity (30-40 students) within a sector.

### Limitations
-   **Rigid Boundaries**: Students living near the boundary of two sectors (e.g., North and North-East) are split into different routes, even if they are neighbors.
-   **Inefficient Routing**: It doesn't consider that a bus could efficiently pick up students from multiple sectors if the road network connects them well (e.g., a ring road).
-   **Outliers**: Isolated students might force a bus to make a long detour just because they fall into that sector.

## Proposed Optimization Ideas

### 1. Smart Clustering (DBSCAN)
Instead of pre-slicing the map into 8 pies, we use **DBSCAN (Density-Based Spatial Clustering of Applications with Noise)**.
-   **How it works**: It looks for "dense" regions of students to form stops. It automatically finds natural clusters of any shape.
-   **Benefit**: It ignores arbitrary direction lines. A cluster of students will always be grouped together regardless of where they are relative to the school.
-   **Outlier Handling**: DBSCAN explicitly identifies "noise" (students far from everyone else). We can handle them separately (e.g., assign to nearest cluster or special shuttle).

### 2. Route Construction (Savings Algorithm)
After we have the stops (from DBSCAN), we need to connect them into routes.
-   **Current**: Just group them by direction.
-   **Proposed**: **Clarke-Wright Savings Algorithm**.
    -   Start with a "route" for every stop (School -> Stop -> School).
    -   Calculate "savings" if we merge two routes (School -> Stop A -> Stop B -> School).
    -   Iteratively merge routes with the highest savings until bus capacity is full.
-   **Benefit**: This naturally builds efficient routes that minimize total driving distance, often resulting in fewer buses or shorter travel times.

### 3. Hierarchical Approach
1.  **Level 1 (Stops)**: Use **DBSCAN** to group students into "Stops" (radius ~500m).
2.  **Level 2 (Routes)**: Use **K-Means** or **Savings Algorithm** to group "Stops" into "Routes" (capacity ~35 students).

## Implementation Proposal
I can implement a new method `suggestRoutesSmart` in `RouteSuggestionService` that uses this new logic.

### New Dependencies
-   `density-clustering` (for DBSCAN) or implement a simple version.
-   Geometric utility functions (already present in `GeoUtils`).

### Workflow
1.  **Fetch All Students**.
2.  **Run DBSCAN**: Group students into `StopCandidates`.
3.  **Route Generation**:
    -   Calculate distance matrix between all `StopCandidates`.
    -   Apply **Savings Algorithm** to merge stops into routes respecting `maxStudentsPerRoute`.
4.  **Optimization**: Use Google Maps API to optimize the final sequence of each route.

## User Interface
-   Add a "Smart Optimization" toggle in the Route Suggestion Dialog.
-   Visualize the clusters before confirming routes.
