import * as path from "path"
import * as fs from "fs"


export default function (buildOptions, a, b) {
    let outDir, manifests, egretProperties, root
    return {
        name: "vite_manifest",
        enforece: "pre",
        apply: "build",
        configResolved(config) {
            outDir = config.build.outDir || ""
            root = config.root || "";
            egretProperties = JSON.parse(fs.readFileSync("./egretProperties.json"))
        },
        async writeBundle(options, bundle) {
            if (buildOptions.generate) {
                manifests = await buildOptions.generate(bundle);
            } else {
                manifests = {};
                manifests.initial = egretProperties.modules.reduce((data, module) => {
                    let name = module.name
                    let p = module.path
                    if (p) {
                        data.push(p)
                    } else {
                        let file_path = path.join("libs/modules/", name, "/", name + ".js")
                        let web_file_path = path.join("libs/modules/", name, "/", name + ".web.js")
                        data.push(file_path)
                        if (fs.existsSync(web_file_path)) {
                            data.push(web_file_path)
                        }
                    }
                    return data
                }, [])
                manifests.game = Object.keys(bundle).reduce((data, name) => {
                    let file_path = path.join(buildOptions.publicPath || "", name).replaceAll(path.sep, "/");
                    if (file_path.endsWith(".js")) {
                        data.push(file_path)
                    }
                    return data;
                }, []);
            }
        },
        closeBundle() {
            console.log(outDir)
            const outputPath = path.join(outDir || "", buildOptions.fileName);
            fs.writeFileSync(outputPath, JSON.stringify(manifests, null, "	"), "utf-8");
            for (let i of manifests.initial) {
                fs.cpSync(i, path.join(outDir, i))
            }
            fs.cpSync("template/web", path.join(outDir, "/"), { recursive: true })
            fs.cpSync("resource/", path.join(outDir, "resource/"), { recursive: true })

        }
    }
}