# MIBAC Antenati IIIF downloader

This script downloads images collection from the IIIF container manifests
created by the Italian Ministry for Cultural Heritage's system *Antenati*.

It may work with any manifest for a IIIF container containing collections of
JPEG files with little adjustments, but I din't extensively test it.

## Installation

You must install [NodeJS](https://nodejs.org/en/) on your machine.

Then, you can run this command to install the script:

```bash
npm install -g @lbreda/antenati-dl
```

You may need administrative powers.

## Usage

You can run:

```bash
antenati-dl URL
```

with the URL being the IIIF Manifest URL. The script will create a directory
named by the collection identifier in the Antenati website, and download the
sequence of images inside the directory.

Each file will be named with the collection identifier followed by a order
number.

The directory will also contain a YAML file with the dump of the collection
metadata.
