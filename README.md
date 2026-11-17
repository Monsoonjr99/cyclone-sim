# Cyclone Simulator

Cyclone Simulator is a web-based simulation experiment aiming to visualize the life cycles of weather events namely tropical cyclones.

## Editions

There are two editions of Cyclone Simulator:

* [Cyclone Simulator Classic](https://monsoonjr99.github.io/cyclone-sim) (v0.x) - The original p5.js project dating back to 2018, warts and all; development being phased out in favor of a ground-up rewrite and to be retired when the latter reaches Beta
* Cyclone Simulator Pre-Alpha (future v1.0) - The new and improved rewrite of Cyclone Simulator in Typescript, planned with [cleaner code structure and extensibility in mind](./blueprint.md); to be initially released as Alpha v1.0 shortly and should eventually usurp v0.x upon reaching Beta

## How To Run

Cyclone Simulator Classic is hosted on Github Pages and you can access it right now from the link above. To run it locally or to see the Pre-Alpha version, follow the steps below:

### Setup

* Make sure you have Node.js and npm installed
* Clone the repository

### Cyclone Simulator Classic

* Switch to `v0-primary` branch
* Host a local web server, such as http-server (`npm install -g http-server`)
* Access from `localhost` in a web browser (port `:8080` for http-server)

### Cyclone Simulator Pre-Alpha

* Switch to `v1-primary` branch (you may be here already)
    * Alternatively `v1-dev` for the latest changes
* Run `npm install`
* Run `npm run start` to start the ParcelJS dev server
    * Alternatively `npm run build` for a production build, though extra steps are required:
        * create a subdirectory of `./dist` called `alpha`
        * move the build artifacts to the `alpha` subdirectory
        * host a web server (such as http-server) from `./dist` (NOT from `./dist/alpha`, it must be the parent directory)
* Access from `localhost` in a web browser (port `:1234` for ParcelJS dev server)
    * Append `/alpha` to URL if using a production build (after port `:8080` if using http-server)
