## Cyclone Simulator Rewrite Blueprint
**Monsoonjr99's plan for the rewrite regarding features and implementation**

* This file serves as a guide for rewriting Cyclone Simulator with planned features in mind
* Code architecture should be flexible and ready to accomodate future additions including these planned features and other suggestions
* Not everything listed here needs to be added by release v1.0, and this file can guide future updates after the rewrite is released
* I should update this file whenever I plan a new addition
* Plans here are flexible and may change
* Plans here shouldn't be too detailed about implementation, since the actual implementation may easily be different
* When an addition is made, particularly if only partly complete, an implementation note may be added, which may include:
    * what is done
    * what is left to do
    * and/or any differences in implementation from the plan
    * multiple notes may be added for any changes over following versions (more technical than changelog.txt; not as in-depth as in-code comments)

### Transition Plan

The plan for phasing out the legacy Cyclone Simulator and replacing it with the rewrite:

* First as a rough prototype with a rudimentary feature set, initially publicly release this edition as Cyclone Simulator Alpha under a /alpha URL and have it exist in parallel with the legacy Cyclone Simulator until the new codebase is ready to replace the old
* During the Alpha development stage, there may be some updating of the legacy v0.x edition, though work should be prioritized on the rewrite
* When the new codebase is ready (modest feature parity and more importantly [save compatibility](#backwards-compatibility)), transfer it to the main URL and call it Cyclone Simulator Beta
* When Beta is released, retire the legacy codebase, move it to a /classic URL, and call it Cyclone Simulator Classic - v0.x updates should cease after this point
    * An early development version of Cyclone Simulator from 2018, in /experiments, currently already has the name "Cyclone Simulator Classic", but should give up this designation in favor of the original "Very Sad HHW Thing"

### Planned Additions

#### The Whole World

* Instead of individual basin maps like pre-v0.4, a single world map should be used, and it should contain:
    * Elevation data
    * Land/water data apart from sea-level elevation (real world has land below sea-level and lakes above sea-level)
    * Boundaries of tropical cyclone basins and their sub-regions for the whole world
        * This is better stored in a vector-based format than on an image like before
* Cyclone Simulator will be able to simulate the whole world
* The user can zoom and pan around a whole Earth map
* Use real latitude and longitude as the coordinate system, unlike the weird XY of v0.x
* Sorry flat Earthers
    * No "edge" of the world that storms cannot cross
    * The user can pan east-west around the world without hitting an edge
* Old real-world saves from v0.x may be converted to work in the new whole-world map (see [Backwards Compatibility](#backwards-compatibility))
* Possibility for procedurally-generated and user-created (see [User Customization](#user-customization)) maps.

#### Storm Simulation Algorithm

* A module to handle active storm systems and how they are steered, strengthening/weakening, and multi-system (Fujiwhara) interactions.
* Algorithm may be defined separately from the source code in a JSON file (see [User Customization](#user-customization)).
* Different [simulation modes](#simulation-modes) may have their own storm simulation algorithms.

#### Spawn Algorithm

* A module or function to handle the spawning of future systems (e.g. disturbances and non-tropical lows).
* May be defined separately from source code in a JSON file.
* Should behave in a way that makes [forecast models](#forecast-models) feel realistic.
* Different [simulation modes](#simulation-modes) may have their own spawn algorithms.

#### Environmental Factors

* A module handles environmental factors which are used by [storm simulation algorithms](#storm-simulation-algorithm) to direct how storms behave and by [spawn algorithms](#spawn-algorithm) to determine likelihood of a system spawn.
* Some environmental factors may be a "field" that depends on map location, while others may be simply a numerical value.
    * "Fields" may have an associated Map Mode for graphical representation (see [UI and Graphics](#ui-and-graphics)).
* Environmental factors may inherit from other environmental factors (e.g. an "ENSO" numerical value may dictate the values of the "SSTA" field for the equatorial Pacific Ocean).
* May be defined separately from source code.
* Different [simulation modes](#simulation-modes) may have their own environmental factors.

#### Simulation Modes

* Cyclone Simulator should support different modes of simulation, including more realistic (i.e. Normal Mode) and more wacky/fun simulations of storm systems and the environments driving them.
* Each simulation mode has an associated [storm simulation algorithm](#storm-simulation-algorithm), [spawn algorithm(s)](#spawn-algorithm), and [environmental factors](#environmental-factors).
* Simulation modes may be defined separately from source code in a JSON file that references the JSON files for associated algorithms & factors.
* Cyclone Simulator should have both default simulation modes and allow users to create their own (see [User Customization](#user-customization)).

#### Forecast Models

* Simulated "numerical weather prediction models" which allow the user to peer into possible futures of active and future storms.
* More accurate in the near term; less accurate farther out in time
* May have "biases" which may influence how the [storm simulation](#storm-simulation-algorithm) and [spawn](#spawn-algorithm) algorithms work for modeled storms.

#### UI and Graphics

* UI should use regular DOM elements separate from the canvas as not to require unnecessary boilerplate.
    * Exceptions being anything directly associated with the map (e.g. storm icons, cities) or anything complex enough to prefer canvas rendering (e.g. timelines).
* Keep a fancy map image of Earth handy so no need to render from a heightmap.
    * Procedurally-generated maps may still need rendering.
    * Maybe render Earth from a heightmap too for that "Cyclone Simulator aesthetic".
* For anything that does require intensive rendering (e.g. Generated maps, hi-res Map Layers), keep code optimized, use web workers if necessary.

#### Saving/Loading

* Worlds should be saved to IndexedDB.
* Save data shall include:
    * Current simulation state (i.e. [active storms](#storm-simulation-algorithm), [environmental factors](#environmental-factors))
    * Records of past storms, environmental data (for map layers), and [per-basin season statistics](#statistics-and-querying)
    * Variable basin metadata (e.g. [name lists](#namingdesignations))
    * [User customizations](#user-customization) specific to a world save
    * Save-related metadata (i.e. version/save format, timestamp)
* Ability to export save data to a file and import from a file.
    * Should use some sort of binary serialization format as raw JSON text is space inefficient.
* Support for loading and converting legacy v0.x saves (see [Backwards Compatibility](#backwards-compatibility)).

#### Backwards Compatibility

* Support for loading at minimum Earth map type saves from v0.4 or later
* May support saves dating back to v0.2, but probably no earlier than that
    * Pre-v0.4 support would require implementing conversions of legacy XY coordinates to latitude/longitude for all map types
* Possibly support loading saves of a procedurally generated map type, which could either be accomplished by:
    * New v0.x version that fully saves procedurally generated map data rather than just the seed and map type
        * Pros: less legacy-related code needed in the new Cyclone Simulator (i.e. cleaner slate)
        * Cons: only supports loading non-Earth saves from at earliest the aforementioned version; Earth and non-Earth map types would have differing extents of support
    * Reimplementing legacy map generation
        * Pros: supports loading non-Earth saves from relatively older versions; parity in support regardless of map type
        * Cons: more legacy-related code required in the rewrite, including a holdover from p5.js in emulating its octave noise implementation
* Old saves when loaded should retain at minimum records of past storms and the states of active storms
    * Records of legacy environmental fields (i.e. map layer history) need not be kept
    * May adopt a [simulation mode](#simulation-modes) equivalent to the save's legacy simulation mode if it exists

#### Statistics and Querying

***WIP***

#### Naming/Designations

***WIP***

#### Cities, Damage, and Deaths

***WIP***

#### User Customization

* Give users a way to upload JSON and image files for custom [simulation modes](#simulation-modes) and [maps](#the-whole-world).
* These "mods" may be stored in IndexedDB much like [saves](#saving/loading).