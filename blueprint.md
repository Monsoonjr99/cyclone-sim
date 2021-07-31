## Cyclone Simulator Rewrite Blueprint
**Monsoonjr99's plan for the rewrite regarding features and implementation**

* This file serves as a guide for rewriting Cyclone Simulator with planned features in mind
* Code architecture should be flexible and ready to accomodate future additions including these planned features and other suggestions
* Not everything listed here needs to be added by release v1.0, and this file can guide future updates after the rewrite is released
* I should update this file whenever I plan a new addition
* Plans here are flexible and may change
* Plans here shouldn't be too detailed about implementation, since the actual implementation may easily be different
* When an addition is completed (including partially), a note should be added saying:
    * what is done
    * what is left to do
    * and any differences in implementation from the plan
    * multiple notes may be needed for any changes over following versions (more technical than changelog.txt; not as in-depth as in-code comments)

### Planned Additions

#### The Whole World

* Instead of individual basin maps like v0.x, a single world map should be used, and it should contain:
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

* A module handles environmental factors which are used by [storm simulation algorithms](#storm-simulation-algorithm) to dictate how storms behave and by [spawn algorithms](#spawn-algorithm) to determine likelihood of a system spawn.
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
* Keep a fancy map image of Earth handy so no need to render from a heightmap.
    * Procedurally-generated maps may still need rendering.
* For anything that does require intensive rendering (e.g. Map Layers), use WebGL.

#### Saving/Loading

***WIP***

#### Backwards Compatibility

***WIP***

#### Statistics and Querying

***WIP***

#### Naming/Designations

***WIP***

#### Cities, Damage, and Deaths

***WIP***

#### User Customization

* Give users a way to upload JSON and image files for custom [simulation modes](#simulation-modes) and [maps](#the-whole-world).
* These "mods" may be stored in IndexedDB much like [saves](#saving/loading).