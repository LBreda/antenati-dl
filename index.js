#!/usr/bin/env node
import fs from "fs"
import fetch from "node-fetch"
import jsyaml from "js-yaml"

// Retrieves input from the console
if (process.argv.length < 3) {
    console.info('Usage: antenati-dl URL [offset] [limit]')
    console.info('  URL: IIIF manifest')
    console.info('  offset: First element to download (1-based, defaults to 1)')
    console.info('  limit: How many elements to download (defaults to all elements after offset)')
    process.exit(1)
}
let uri = process.argv[2]
let offset = (parseInt(process.argv[3]) || 1) - 1
let limit = parseInt(process.argv[4]) || undefined

const reqHeaders = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:97.0) Gecko/20100101 Firefox/97.0',
        'Origin': 'https://www.antenati.san.beniculturali.it',
        'Referer': 'https://www.antenati.san.beniculturali.it/'
    }
}

// Downloads data
function downloader(data) {
    // Creates output dir
    let dirname = data.metadata.filter(datum => datum.value.includes('detail-registry'))[0].value.match(/s_id=(\d+)/)[1]
    !fs.existsSync(`./${dirname}/`) && fs.mkdirSync(`./${dirname}/`, { recursive: true })

    // Prints some info
    console.info(`Downloading container labeled ${data.label}`)
    console.info(`Description:`)
    data.description.forEach(descriptionLine => console.info(`  ${descriptionLine}`))

    // Saves metadata file (it may be useful)
    fs.writeFileSync(`./${dirname}/${dirname}_meta.yml`, jsyaml.dump(data.metadata))
    console.info(`Saved metadata in ${dirname}/${dirname}_meta.yml`)

    // Downloads images
    data.sequences.forEach(sequence => {
        console.info(`Downloading sequence: ${sequence.label}...`)

        sequence.canvases.slice(offset, limit ? offset + limit : sequence.canvases.length).forEach((canvas, index) => {
            let formattedIndex = `${index + 1 + offset}`.padStart(5, "0")
            canvas.images.forEach((resourceContainer, resourceIndex) => {
                let suffix = canvas.images.length == 1 ? '' : `_${resourceIndex}`
                let fileName = `${dirname}_${formattedIndex}${suffix}.jpg`
                let fileUrl = resourceContainer.resource['@id']

                try {
                    fetch(fileUrl, reqHeaders).then(resource => resource.arrayBuffer()).then(image => {
                        // Removes file if it already exists
                        fs.existsSync(`./${dirname}/${fileName}`) && fs.unlinkSync(`./${dirname}/${fileName}`)

                        // Writes file
                        fs.appendFile(`./${dirname}/${fileName}`, new Buffer.from(image), (err) => {
                            if (!err) console.info(`Downloaded ${fileUrl} as ${dirname}/${fileName}`)
                            else printError(fileUrl, dirname, fileName, err)
                        })
                    }).catch(err => printError(fileUrl, dirname, fileName, err))
                } catch (err) {
                    printError(fileUrl, dirname, fileName, err)
                }
            })
        })
    });

}

let printError = (fileUrl, dirName, fileName, err) => console.error(`Error downloading ${fileUrl} as ${dirName}/${fileName}: ${err}`)

// Execution
fetch(uri, reqHeaders).then(resource => resource.json()).then(data => downloader(data))