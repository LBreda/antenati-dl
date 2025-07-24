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
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
        'Origin': 'https://antenati.cultura.gov.it',
        'Referer': 'https://antenati.cultura.gov.it/',
    }
}

// Removes last n parts of URL
function removeLastPartsOf(url, parts_no)
{
    parts_no = parts_no ?? 1;
    var split_url = url.split('/');
    for (let i = 0; i < parts_no; i++) {
        split_url.pop();
    }
    return( split_url.join('/') );
}


// Downloads data
function downloader(data) {
    // Creates output dir
    let dirname = data.metadata.filter(datum => datum.value.includes('/an_ua'))[0].value.match(/an_ua(\d+)/)[1]
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
                let suffix = canvas.images.length === 1 ? '' : `_${resourceIndex}`
                let fileName = `${dirname}_${formattedIndex}${suffix}.jpg`
                let fileUrl = resourceContainer.resource['@id']
                let fileInfoUrl = removeLastPartsOf(fileUrl, 4)

                try {
                    fetch(fileInfoUrl, reqHeaders).then(resource => resource.json()).then(fileInfo => {
                        fileUrl = `${fileInfoUrl}/full/${fileInfo.width},${fileInfo.height}/0/default.jpg`
                        fetch(fileUrl, reqHeaders).then(resource => resource.arrayBuffer()).then(image => {
                            // Removes file if it already exists
                            fs.existsSync(`./${dirname}/${fileName}`) && fs.unlinkSync(`./${dirname}/${fileName}`)

                            // Writes file
                            fs.appendFile(`./${dirname}/${fileName}`, new Buffer.from(image), (err) => {
                                if (!err) console.info(`Downloaded ${fileUrl} as ${dirname}/${fileName}`)
                                else printError(fileUrl, dirname, fileName, err)
                            })
                        }).catch(err => printError(fileUrl, dirname, fileName, err))
                    }).catch(err => printError(fileInfoUrl, dirname, fileName, err))
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
