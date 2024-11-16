import * as fs from "fs"
import * as path from "path"

function mkdirs(dir){
    let dirs = dir.split(path.sep)
    let dir_path = ""
    for(let i of dirs){
        dir_path += i + path.sep
        if(!fs.existsSync(dir_path)){
            fs.mkdirSync(dir_path)
        }
    }
}

function copy(source,target){
    if(fs.existsSync(source)){
        let st = fs.statSync(source)
        if(st.isFile()){
            if(target.endsWith("/")){
                mkdirs(target)
                fs.copyFileSync(source,path.join(target,path.basename(source)))
            }else{
                mkdirs(path.dirname(target))
                fs.copyFileSync(source,target)
            }
        }else{
            let files = fs.readdirSync(source)
            for(let i of files){
                copy(path.join(source,i),path.join(target,i))
            }
        }
    }
}

export {
    copy,
    mkdirs
}