// scripts/gen-icons.cjs
// Binafsha vertikal gradient (#7c3aed -> #5b21b6) + markazda oq serif "I".
const fs = require("fs");
const zlib = require("zlib");

function crc32(buf){let c=~0;for(let i=0;i<buf.length;i++){c^=buf[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xEDB88320&-(c&1));}return (~c)>>>0;}
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const t=Buffer.from(type);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}

const TOP=[124,58,237], BOT=[91,33,182], WHITE=[255,255,255];
function lerp(a,b,t){return Math.round(a+(b-a)*t);}

// "I" glyph normalized bounds (0..1). Serifli: yuqori/pastki plankalar + o'rta stem.
function inGlyph(nx,ny){
  const stem = nx>=0.42&&nx<=0.58&&ny>=0.24&&ny<=0.76;
  const top  = nx>=0.30&&nx<=0.70&&ny>=0.22&&ny<=0.31;
  const bot  = nx>=0.30&&nx<=0.70&&ny>=0.69&&ny<=0.78;
  return stem||top||bot;
}

function png(size){
  const sig=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=2; // 8-bit RGB
  const rows=[];
  for(let y=0;y<size;y++){
    const row=Buffer.alloc(1+size*3); // filter byte + RGB
    const ty=y/(size-1);
    const bg=[lerp(TOP[0],BOT[0],ty),lerp(TOP[1],BOT[1],ty),lerp(TOP[2],BOT[2],ty)];
    for(let x=0;x<size;x++){
      const c=inGlyph(x/(size-1),ty)?WHITE:bg;
      row[1+x*3]=c[0];row[2+x*3]=c[1];row[3+x*3]=c[2];
    }
    rows.push(row);
  }
  const idat=zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([sig,chunk("IHDR",ihdr),chunk("IDAT",idat),chunk("IEND",Buffer.alloc(0))]);
}

fs.mkdirSync("public/icons",{recursive:true});
fs.writeFileSync("public/icons/icon-192.png",png(192));
fs.writeFileSync("public/icons/icon-512.png",png(512));
fs.writeFileSync("public/icons/maskable-512.png",png(512));
console.log("icons written: gradient + I");
