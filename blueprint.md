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

#### Storm Simulation Algorithm

***WIP***

#### Spawn Algorithm

***WIP***

#### Simulation Modes

***WIP***

#### Forecast Models

***WIP***

#### UI and Graphics

***WIP***

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

***WIP***