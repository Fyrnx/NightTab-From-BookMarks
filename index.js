const ytdl = require("ytdl-core");
const ffmpeg = require('ffmpeg-static');
const cp = require('child_process');
const http = require("http")
const https = require("https")
const fs = require("fs")
const path = require("path")

let urlsObject = JSON.parse(fs.readFileSync("urls.json","utf-8"))

function randomUrl() {
    let index = random(0,urlsObject.length - 1)
    return urlsObject[index]
}

function random(min,max) { 
    let randomParem = Math.random()
    let delta = max - min
    return Math.round(randomParem * delta) + min
}

function randomVideo(res) {
    let url = randomUrl()
    // let protocol = http;
    // if((/^https:/ig).test(url)) protocol = https;
    let CharacterEntities = { 
        " ":"&nbsp;",
        "<":"%lt;",
        ">":"&gt;",
        "&":"&amp;",
        "\"":"&quot;",
        "\'":"&apos;",
        "¢":"&cent;",
        "£":"&pound;",
        "¥":"&yen;",
        "€":"&euro;",
        "©":"&copy;",
        "®":"&reg;",
    }

    console.clear();
    
    Object.entries(CharacterEntities).forEach(entry => {
        let [character,entitie] = entry
        url = url.replaceAll(entitie,character)
    })


    handelResponse(url,res)
}

let server = http.createServer((req,res) => {
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    
    let urls = []
    functions = {
        GET,POST,PATCH,DELETE
    }

    let method = new URL(path.join(__dirname,req.url)).searchParams.get("method")

    if(method == "GET" || method == null) {
        functions.GET(res)
        return
    }

    req.on("data",data => { 
        jsonObject = JSON.parse(data);
        let index = 0

        jsonObject.forEach((url,x) => { 
            url = url
            index++
            if(url != null) {
                urls.push(url)
            }

            if(index == jsonObject.length) {
                let fun = functions[method]
                if(fun) fun() 
                
                fs.writeFileSync("urls.json",JSON.stringify(urlsObject))
                res.end()
            }
            
        })
    })

    function POST() {
        urls.forEach(url => { 
            let exist = urlsObject.indexOf(url) != -1
            if(!exist) {
                urlsObject.push(url)
            }
        })
    }

    function PATCH() {
        urlsObject = urls
    }

    function DELETE() {
        urls.forEach(url => { 
            let index = urlsObject.indexOf(url)
            if(index != -1) {
                urlsObject.splice(index,1)
            }
        })
    }

    function GET() {
        randomVideo(res)
    }

})

server.listen(process.env.PORT ?? 2600,undefined, _ => { 
    console.log(`it runed ${process.env.PORT ?? 2600}`);
})

let responseHandelers = { 
    "youtube.com": { 
        regex: /youtube\.com\/watch/,
        func: youtubeVideo
    }
}

function handelResponse(url,res) { 
    let protocol = http;
    if((/^https:/ig).test(url)) protocol = https;

    let handeler
    Object.values(responseHandelers).every(handel => { 
        let match = handel.regex.test(url)
        if(match) handeler = handel
        return !match
    })

    if(handeler) {
        handeler.func({url,res})
        return
    }

    protocol.get(url,respond => {
        respond.pipe(res)
    })
}


let url = "https://www.youtube.com/watch?v=TJby4H4cQRM&t=3s"

async function youtubeVideo({url,res} = {}) {
    let audioStream = ytdl(url,{quality:'highestaudio',filter:"audioonly"});
    let videoStream = ytdl(url,{quality:'highestvideo'});

    const ffmpegProcess = cp.spawn(ffmpeg, [
        '-i', `pipe:3`,
        '-i', `pipe:4`,
        '-map','0:v',
        '-map','1:a',
        '-c:v', 'copy',
        '-c:a', 'libmp3lame',
        '-crf','27',
        '-preset','veryfast',
        '-movflags','frag_keyframe+empty_moov',
        '-f','mp4',
        '-loglevel','error',
        '-'
    ], {
        stdio: [
        'pipe', 'pipe', 'pipe', 'pipe', 'pipe'
        ],
    });
    
    videoStream.pipe(ffmpegProcess.stdio[3]);
    audioStream.pipe(ffmpegProcess.stdio[4]);
    ffmpegProcess.stdio[1].pipe(res);
}   
