'use strict';
// Cabeçalho compartilhado entre os PDFs de clientes e visitas.
// A segunda assinatura comercial é pequena e não substitui o CRECI individual.
function bonanzaMini(doc,x,y){
  const g='#C9963B', green='#0A5632';
  doc.fillColor(g).circle(x+6,y+8,5).fill();
  doc.fillColor(g).path('M '+(x+15)+' '+(y+23)+' L '+(x+15)+' '+(y+11)+' L '+(x+26)+' '+(y+2)+' L '+(x+37)+' '+(y+11)+' L '+(x+37)+' '+(y+23)).lineWidth(2.4).strokeColor(g).stroke();
  doc.fillColor(green).path('M '+x+' '+(y+29)+' Q '+(x+12)+' '+(y+9)+' '+(x+22)+' '+(y+21)+' Q '+(x+31)+' '+(y+26)+' '+(x+41)+' '+(y+29)+' Z').fill();
  doc.strokeColor(green).lineWidth(1.7).moveTo(x+27,y+21).lineTo(x+27,y+10).stroke();
  doc.font('Times-Bold').fillColor(green).fontSize(12).text('BONANZA',x+46,y+5,{lineBreak:false});
  doc.font('Helvetica').fontSize(6.3).fillColor(green).text('IMÓVEIS LTDA',x+47,y+20,{lineBreak:false});
  doc.font('Helvetica').fontSize(5.6).text('CRECI PJ 3010',x+47,y+29,{lineBreak:false});
}
function drawBrand(doc,opts={}){
 const x=Number(opts.x??44),y=Number(opts.y??30);
 const green='#16642F',orange='#F26A08';
 doc.save();
 // Casa e chave
 doc.strokeColor(orange).lineWidth(5.5).lineJoin('round').lineCap('round')
    .path('M '+(x+5)+' '+(y+38)+' L '+(x+31)+' '+(y+11)+' L '+(x+57)+' '+(y+36)).stroke();
 doc.fillColor(green).rect(x+26,y+35,8,8).fill();
 doc.fillColor(green).rect(x+36,y+35,8,8).fill();
 doc.strokeColor(orange).lineWidth(3.5).path('M '+(x+6)+' '+(y+61)+' Q '+(x+34)+' '+(y+40)+' '+(x+68)+' '+(y+59)).stroke();
 doc.strokeColor(green).lineWidth(2.5).path('M '+(x+6)+' '+(y+65)+' Q '+(x+34)+' '+(y+47)+' '+(x+68)+' '+(y+63)).stroke();
 doc.strokeColor(orange).lineWidth(3).circle(x+61,y+37,9).stroke();
 doc.fillColor(green).circle(x+61,y+37,3).fill();
 doc.font('Helvetica-Bold').fontSize(21).fillColor(green).text('Lilian e Douglas',x+86,y+10,{lineBreak:false});
 doc.strokeColor(orange).lineWidth(2).moveTo(x+86,y+36).lineTo(x+378,y+36).stroke();
 doc.font('Times-Italic').fontSize(12).fillColor(orange).text('Conectando você ao imóvel certo',x+91,y+41,{width:289,lineBreak:false});
 doc.font('Helvetica-Bold').fontSize(9).fillColor(green).text('CRECI MG 61414',x+2,y+69,{lineBreak:false});
 bonanzaMini(doc,x+3,y+83);
 doc.strokeColor('#E6E4DD').lineWidth(.7).moveTo(x,y+123).lineTo(x+504,y+123).stroke();
 doc.restore();
 doc.y=y+133;
 return doc.y;
}

/* Autorização de venda: usa a logo oficial do site (não redesenha a marca).
   As fichas de cliente e visitas continuam usando o cabeçalho já existente. */
function drawAuthorizationBrand(doc,opts={}){
 const fs=require('fs'),path=require('path');
 const SVGtoPDF=require('svg-to-pdfkit');
 const x=Number(opts.x??44),y=Number(opts.y??26);
 const width=Number(opts.width??245);
 const svg=fs.readFileSync(path.join(__dirname,'assets','lilian-douglas-logo-verde-laranja.svg'),'utf8');
 const height=width*190/800;
 doc.save();
 SVGtoPDF(doc,svg,x,y,{
   width,height,
   preserveAspectRatio:'xMinYMid meet',
   assumePt:false,
   fontCallback:(family,bold,italic,options)=>'Helvetica'
 });
 doc.restore();
 doc.y=Math.max(doc.y,y+height+18);
 return doc.y;
}

module.exports={drawBrand,drawAuthorizationBrand};
