const koa = require('koa');
const fs = require('fs');
const Router = require('koa-router');
const mime = require('mime');
const http2 = require('http2');

const {HTTP2_HEADER_PATH} = http2.constants;// :path

const options = {
    key: fs.readFileSync('localhost-privkey.pem'),
    cert: fs.readFileSync('localhost-cert.pem')
}

const app = new koa();
const router = new Router();

router.get('/', async ctx => {
   ctx.body = 'ok'
})

router.get('/learn', async ctx => {
    const indexObj = getFdAndHeader('index.html');
    // const jsObj = getFdAndHeader('someJs.js');
    const cssObj = getFdAndHeader('someCss.css');

    // push(res.stream, jsObj);
    push(ctx.res.stream, cssObj);

    ctx.res.stream.respondWithFD(indexObj.fd, indexObj.headers);
})


app.use(router.routes());

http2.createSecureServer(options,app.callback())
.listen(8001,(err)=>{
    if(err) {
        console.log(err);
        process.exit(1);
    }
    console.log('koa & http2 is start and listen on 8001')
});

function push(stream, obj) {
    stream.pushStream({[HTTP2_HEADER_PATH]: obj.urlPath}, (err,pushStream) => {
        pushStream.respondWithFD(obj.fd, obj.headers)
    })
}

const getFdAndHeader = (fileName) => {
    const filePath = "public/" + fileName;
    const fd = fs.openSync(filePath, 'r');
    const stat = fs.fstatSync(fd);
    const urlPath = "/" + fileName;
    const headers = {
        'content-length': stat.size,
        'last-modified': stat.mtime.toUTCString(),
        'content-type': mime.lookup(filePath)
    };
    return {fd, headers, urlPath};
};