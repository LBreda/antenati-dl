#!/usr/bin/env node
import fs from "fs"
import fetch from "node-fetch"
import jsyaml from "js-yaml"

// Retrieves input from the console
if(process.argv.length < 3) {
    console.info('Usage: antenati-dl URL')
    process.exit(1)
}
let uri = process.argv[2]

// Downloads data
function downloader (data) {
    // Creates output dir
    let dirname = data.metadata.filter(datum => datum.value.includes('detail-registry'))[0].value.match(/s_id=(\d+)/)[1]
    !fs.existsSync(`./${dirname}/`) && fs.mkdirSync(`./${dirname}/`, {recursive: true})

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
        
        sequence.canvases.forEach((canvas, index) => {
            let formattedIndex = `${index+1}`.padStart(5, "0")
            canvas.images.forEach((resourceContainer, resourceIndex) => {
                let suffix = canvas.images.length == 1 ? '' : `_${resourceIndex}`
                let fileName = `${dirname}_${formattedIndex}${suffix}.jpg`
                let fileUrl = resourceContainer.resource['@id']

                try {
                    fetch(fileUrl).then(resource => resource.arrayBuffer()).then(image => {
                        // Removes file if it already exists
                        fs.existsSync(`./${dirname}/${fileName}`) && fs.unlinkSync(`./${dirname}/${fileName}`)

                        // Writes file
                        fs.appendFile(`./${dirname}/${fileName}`, new Buffer.from(image), (err) => {
                            if(!err) console.info(`Downloaded ${fileUrl} as ${dirname}/${fileName}`)
                            else console.error(`Error downloading ${fileUrl} as ${dirname}/${fileName}: ${err}`)
                        })
                    })
                } catch (err) {
                    console.error(`Error downloading ${fileUrl} as ${dirname}/${fileName}: ${err}`)
                }
            })
        })
    });

}

// Execution
fetch(uri).then(resource => resource.json()).then(data => downloader(data))