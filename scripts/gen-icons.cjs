// scripts/gen-icons.cjs
const fs = require("fs");
const zlib = require("zlib");
function crc32(buf){let c=~0;for(let i=0;i<buf.length;i++){c^=buf[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xEDB88320&-(c&1));}return (~c)>>>0;}
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const t=Buffer.from(type);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}
function png(size,[r,g,b]){const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=2;const row=Buffer.alloc(1+size*3);for(let x=0;x<size;x++){row[1+x*3]=r;row[2+x*3]=g;row[3+x*3]=b;}const raw=Buffer.concat(Array.from({length:size},()=>row));const idat=zlib.deflateSync(raw);const sig=Buffer.from([137,80,78,71,13,10,26,10]);return Buffer.concat([sig,chunk("IHDR",ihdr),chunk("IDAT",idat),chunk("IEND",Buffer.alloc(0))]);}
const purple=[91,33,182];
fs.mkdirSync("public/icons",{recursive:true});
fs.writeFileSync("public/icons/icon-512.png",png(512,purple));
fs.writeFileSync("public/icons/icon-192.png",png(192,purple));
fs.writeFileSync("public/icons/maskable-512.png",png(512,purple));
console.log("icons written");
