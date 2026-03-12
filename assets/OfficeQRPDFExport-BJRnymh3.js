import{aj as St}from"./index-ckjZnHAL.js";var j={},Rt=function(){return typeof Promise=="function"&&Promise.prototype&&Promise.prototype.then},gt={},T={};let it;const Lt=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];T.getSymbolSize=function(t){if(!t)throw new Error('"version" cannot be null or undefined');if(t<1||t>40)throw new Error('"version" should be in range from 1 to 40');return t*4+17};T.getSymbolTotalCodewords=function(t){return Lt[t]};T.getBCHDigit=function(e){let t=0;for(;e!==0;)t++,e>>>=1;return t};T.setToSJISFunction=function(t){if(typeof t!="function")throw new Error('"toSJISFunc" is not a valid function.');it=t};T.isKanjiModeEnabled=function(){return typeof it<"u"};T.toSJIS=function(t){return it(t)};var O={};(function(e){e.L={bit:1},e.M={bit:0},e.Q={bit:3},e.H={bit:2};function t(i){if(typeof i!="string")throw new Error("Param is not a string");switch(i.toLowerCase()){case"l":case"low":return e.L;case"m":case"medium":return e.M;case"q":case"quartile":return e.Q;case"h":case"high":return e.H;default:throw new Error("Unknown EC Level: "+i)}}e.isValid=function(o){return o&&typeof o.bit<"u"&&o.bit>=0&&o.bit<4},e.from=function(o,n){if(e.isValid(o))return o;try{return t(o)}catch{return n}}})(O);function ht(){this.buffer=[],this.length=0}ht.prototype={get:function(e){const t=Math.floor(e/8);return(this.buffer[t]>>>7-e%8&1)===1},put:function(e,t){for(let i=0;i<t;i++)this.putBit((e>>>t-i-1&1)===1)},getLengthInBits:function(){return this.length},putBit:function(e){const t=Math.floor(this.length/8);this.buffer.length<=t&&this.buffer.push(0),e&&(this.buffer[t]|=128>>>this.length%8),this.length++}};var Dt=ht;function x(e){if(!e||e<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=e,this.data=new Uint8Array(e*e),this.reservedBit=new Uint8Array(e*e)}x.prototype.set=function(e,t,i,o){const n=e*this.size+t;this.data[n]=i,o&&(this.reservedBit[n]=!0)};x.prototype.get=function(e,t){return this.data[e*this.size+t]};x.prototype.xor=function(e,t,i){this.data[e*this.size+t]^=i};x.prototype.isReserved=function(e,t){return this.reservedBit[e*this.size+t]};var kt=x,mt={};(function(e){const t=T.getSymbolSize;e.getRowColCoords=function(o){if(o===1)return[];const n=Math.floor(o/7)+2,r=t(o),s=r===145?26:Math.ceil((r-13)/(2*n-2))*2,c=[r-7];for(let a=1;a<n-1;a++)c[a]=c[a-1]-s;return c.push(6),c.reverse()},e.getPositions=function(o){const n=[],r=e.getRowColCoords(o),s=r.length;for(let c=0;c<s;c++)for(let a=0;a<s;a++)c===0&&a===0||c===0&&a===s-1||c===s-1&&a===0||n.push([r[c],r[a]]);return n}})(mt);var wt={};const Ut=T.getSymbolSize,ut=7;wt.getPositions=function(t){const i=Ut(t);return[[0,0],[i-ut,0],[0,i-ut]]};var pt={};(function(e){e.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};const t={N1:3,N2:3,N3:40,N4:10};e.isValid=function(n){return n!=null&&n!==""&&!isNaN(n)&&n>=0&&n<=7},e.from=function(n){return e.isValid(n)?parseInt(n,10):void 0},e.getPenaltyN1=function(n){const r=n.size;let s=0,c=0,a=0,u=null,l=null;for(let C=0;C<r;C++){c=a=0,u=l=null;for(let m=0;m<r;m++){let f=n.get(C,m);f===u?c++:(c>=5&&(s+=t.N1+(c-5)),u=f,c=1),f=n.get(m,C),f===l?a++:(a>=5&&(s+=t.N1+(a-5)),l=f,a=1)}c>=5&&(s+=t.N1+(c-5)),a>=5&&(s+=t.N1+(a-5))}return s},e.getPenaltyN2=function(n){const r=n.size;let s=0;for(let c=0;c<r-1;c++)for(let a=0;a<r-1;a++){const u=n.get(c,a)+n.get(c,a+1)+n.get(c+1,a)+n.get(c+1,a+1);(u===4||u===0)&&s++}return s*t.N2},e.getPenaltyN3=function(n){const r=n.size;let s=0,c=0,a=0;for(let u=0;u<r;u++){c=a=0;for(let l=0;l<r;l++)c=c<<1&2047|n.get(u,l),l>=10&&(c===1488||c===93)&&s++,a=a<<1&2047|n.get(l,u),l>=10&&(a===1488||a===93)&&s++}return s*t.N3},e.getPenaltyN4=function(n){let r=0;const s=n.data.length;for(let a=0;a<s;a++)r+=n.data[a];return Math.abs(Math.ceil(r*100/s/5)-10)*t.N4};function i(o,n,r){switch(o){case e.Patterns.PATTERN000:return(n+r)%2===0;case e.Patterns.PATTERN001:return n%2===0;case e.Patterns.PATTERN010:return r%3===0;case e.Patterns.PATTERN011:return(n+r)%3===0;case e.Patterns.PATTERN100:return(Math.floor(n/2)+Math.floor(r/3))%2===0;case e.Patterns.PATTERN101:return n*r%2+n*r%3===0;case e.Patterns.PATTERN110:return(n*r%2+n*r%3)%2===0;case e.Patterns.PATTERN111:return(n*r%3+(n+r)%2)%2===0;default:throw new Error("bad maskPattern:"+o)}}e.applyMask=function(n,r){const s=r.size;for(let c=0;c<s;c++)for(let a=0;a<s;a++)r.isReserved(a,c)||r.xor(a,c,i(n,a,c))},e.getBestMask=function(n,r){const s=Object.keys(e.Patterns).length;let c=0,a=1/0;for(let u=0;u<s;u++){r(u),e.applyMask(u,n);const l=e.getPenaltyN1(n)+e.getPenaltyN2(n)+e.getPenaltyN3(n)+e.getPenaltyN4(n);e.applyMask(u,n),l<a&&(a=l,c=u)}return c}})(pt);var Y={};const R=O,V=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],H=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];Y.getBlocksCount=function(t,i){switch(i){case R.L:return V[(t-1)*4+0];case R.M:return V[(t-1)*4+1];case R.Q:return V[(t-1)*4+2];case R.H:return V[(t-1)*4+3];default:return}};Y.getTotalCodewordsCount=function(t,i){switch(i){case R.L:return H[(t-1)*4+0];case R.M:return H[(t-1)*4+1];case R.Q:return H[(t-1)*4+2];case R.H:return H[(t-1)*4+3];default:return}};var yt={},G={};const F=new Uint8Array(512),K=new Uint8Array(256);(function(){let t=1;for(let i=0;i<255;i++)F[i]=t,K[t]=i,t<<=1,t&256&&(t^=285);for(let i=255;i<512;i++)F[i]=F[i-255]})();G.log=function(t){if(t<1)throw new Error("log("+t+")");return K[t]};G.exp=function(t){return F[t]};G.mul=function(t,i){return t===0||i===0?0:F[K[t]+K[i]]};(function(e){const t=G;e.mul=function(o,n){const r=new Uint8Array(o.length+n.length-1);for(let s=0;s<o.length;s++)for(let c=0;c<n.length;c++)r[s+c]^=t.mul(o[s],n[c]);return r},e.mod=function(o,n){let r=new Uint8Array(o);for(;r.length-n.length>=0;){const s=r[0];for(let a=0;a<n.length;a++)r[a]^=t.mul(n[a],s);let c=0;for(;c<r.length&&r[c]===0;)c++;r=r.slice(c)}return r},e.generateECPolynomial=function(o){let n=new Uint8Array([1]);for(let r=0;r<o;r++)n=e.mul(n,new Uint8Array([1,t.exp(r)]));return n}})(yt);const Ct=yt;function st(e){this.genPoly=void 0,this.degree=e,this.degree&&this.initialize(this.degree)}st.prototype.initialize=function(t){this.degree=t,this.genPoly=Ct.generateECPolynomial(this.degree)};st.prototype.encode=function(t){if(!this.genPoly)throw new Error("Encoder not initialized");const i=new Uint8Array(t.length+this.degree);i.set(t);const o=Ct.mod(i,this.genPoly),n=this.degree-o.length;if(n>0){const r=new Uint8Array(this.degree);return r.set(o,n),r}return o};var _t=st,Et={},L={},at={};at.isValid=function(t){return!isNaN(t)&&t>=1&&t<=40};var N={};const bt="[0-9]+",vt="[A-Z $%*+\\-./:]+";let z="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";z=z.replace(/u/g,"\\u");const Ft="(?:(?![A-Z0-9 $%*+\\-./:]|"+z+`)(?:.|[\r
]))+`;N.KANJI=new RegExp(z,"g");N.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g");N.BYTE=new RegExp(Ft,"g");N.NUMERIC=new RegExp(bt,"g");N.ALPHANUMERIC=new RegExp(vt,"g");const zt=new RegExp("^"+z+"$"),xt=new RegExp("^"+bt+"$"),Vt=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");N.testKanji=function(t){return zt.test(t)};N.testNumeric=function(t){return xt.test(t)};N.testAlphanumeric=function(t){return Vt.test(t)};(function(e){const t=at,i=N;e.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},e.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},e.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},e.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},e.MIXED={bit:-1},e.getCharCountIndicator=function(r,s){if(!r.ccBits)throw new Error("Invalid mode: "+r);if(!t.isValid(s))throw new Error("Invalid version: "+s);return s>=1&&s<10?r.ccBits[0]:s<27?r.ccBits[1]:r.ccBits[2]},e.getBestModeForData=function(r){return i.testNumeric(r)?e.NUMERIC:i.testAlphanumeric(r)?e.ALPHANUMERIC:i.testKanji(r)?e.KANJI:e.BYTE},e.toString=function(r){if(r&&r.id)return r.id;throw new Error("Invalid mode")},e.isValid=function(r){return r&&r.bit&&r.ccBits};function o(n){if(typeof n!="string")throw new Error("Param is not a string");switch(n.toLowerCase()){case"numeric":return e.NUMERIC;case"alphanumeric":return e.ALPHANUMERIC;case"kanji":return e.KANJI;case"byte":return e.BYTE;default:throw new Error("Unknown mode: "+n)}}e.from=function(r,s){if(e.isValid(r))return r;try{return o(r)}catch{return s}}})(L);(function(e){const t=T,i=Y,o=O,n=L,r=at,s=7973,c=t.getBCHDigit(s);function a(m,f,w){for(let p=1;p<=40;p++)if(f<=e.getCapacity(p,w,m))return p}function u(m,f){return n.getCharCountIndicator(m,f)+4}function l(m,f){let w=0;return m.forEach(function(p){const B=u(p.mode,f);w+=B+p.getBitsLength()}),w}function C(m,f){for(let w=1;w<=40;w++)if(l(m,w)<=e.getCapacity(w,f,n.MIXED))return w}e.from=function(f,w){return r.isValid(f)?parseInt(f,10):w},e.getCapacity=function(f,w,p){if(!r.isValid(f))throw new Error("Invalid QR Code version");typeof p>"u"&&(p=n.BYTE);const B=t.getSymbolTotalCodewords(f),d=i.getTotalCodewordsCount(f,w),y=(B-d)*8;if(p===n.MIXED)return y;const h=y-u(p,f);switch(p){case n.NUMERIC:return Math.floor(h/10*3);case n.ALPHANUMERIC:return Math.floor(h/11*2);case n.KANJI:return Math.floor(h/13);case n.BYTE:default:return Math.floor(h/8)}},e.getBestVersionForData=function(f,w){let p;const B=o.from(w,o.M);if(Array.isArray(f)){if(f.length>1)return C(f,B);if(f.length===0)return 1;p=f[0]}else p=f;return a(p.mode,p.getLength(),B)},e.getEncodedBits=function(f){if(!r.isValid(f)||f<7)throw new Error("Invalid QR Code version");let w=f<<12;for(;t.getBCHDigit(w)-c>=0;)w^=s<<t.getBCHDigit(w)-c;return f<<12|w}})(Et);var Bt={};const et=T,At=1335,Ht=21522,ft=et.getBCHDigit(At);Bt.getEncodedBits=function(t,i){const o=t.bit<<3|i;let n=o<<10;for(;et.getBCHDigit(n)-ft>=0;)n^=At<<et.getBCHDigit(n)-ft;return(o<<10|n)^Ht};var Tt={};const Kt=L;function D(e){this.mode=Kt.NUMERIC,this.data=e.toString()}D.getBitsLength=function(t){return 10*Math.floor(t/3)+(t%3?t%3*3+1:0)};D.prototype.getLength=function(){return this.data.length};D.prototype.getBitsLength=function(){return D.getBitsLength(this.data.length)};D.prototype.write=function(t){let i,o,n;for(i=0;i+3<=this.data.length;i+=3)o=this.data.substr(i,3),n=parseInt(o,10),t.put(n,10);const r=this.data.length-i;r>0&&(o=this.data.substr(i),n=parseInt(o,10),t.put(n,r*3+1))};var Jt=D;const jt=L,W=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function k(e){this.mode=jt.ALPHANUMERIC,this.data=e}k.getBitsLength=function(t){return 11*Math.floor(t/2)+6*(t%2)};k.prototype.getLength=function(){return this.data.length};k.prototype.getBitsLength=function(){return k.getBitsLength(this.data.length)};k.prototype.write=function(t){let i;for(i=0;i+2<=this.data.length;i+=2){let o=W.indexOf(this.data[i])*45;o+=W.indexOf(this.data[i+1]),t.put(o,11)}this.data.length%2&&t.put(W.indexOf(this.data[i]),6)};var Ot=k;const Yt=L;function U(e){this.mode=Yt.BYTE,typeof e=="string"?this.data=new TextEncoder().encode(e):this.data=new Uint8Array(e)}U.getBitsLength=function(t){return t*8};U.prototype.getLength=function(){return this.data.length};U.prototype.getBitsLength=function(){return U.getBitsLength(this.data.length)};U.prototype.write=function(e){for(let t=0,i=this.data.length;t<i;t++)e.put(this.data[t],8)};var Gt=U;const Qt=L,qt=T;function _(e){this.mode=Qt.KANJI,this.data=e}_.getBitsLength=function(t){return t*13};_.prototype.getLength=function(){return this.data.length};_.prototype.getBitsLength=function(){return _.getBitsLength(this.data.length)};_.prototype.write=function(e){let t;for(t=0;t<this.data.length;t++){let i=qt.toSJIS(this.data[t]);if(i>=33088&&i<=40956)i-=33088;else if(i>=57408&&i<=60351)i-=49472;else throw new Error("Invalid SJIS character: "+this.data[t]+`
Make sure your charset is UTF-8`);i=(i>>>8&255)*192+(i&255),e.put(i,13)}};var Wt=_,It={exports:{}};(function(e){var t={single_source_shortest_paths:function(i,o,n){var r={},s={};s[o]=0;var c=t.PriorityQueue.make();c.push(o,0);for(var a,u,l,C,m,f,w,p,B;!c.empty();){a=c.pop(),u=a.value,C=a.cost,m=i[u]||{};for(l in m)m.hasOwnProperty(l)&&(f=m[l],w=C+f,p=s[l],B=typeof s[l]>"u",(B||p>w)&&(s[l]=w,c.push(l,w),r[l]=u))}if(typeof n<"u"&&typeof s[n]>"u"){var d=["Could not find a path from ",o," to ",n,"."].join("");throw new Error(d)}return r},extract_shortest_path_from_predecessor_list:function(i,o){for(var n=[],r=o;r;)n.push(r),i[r],r=i[r];return n.reverse(),n},find_path:function(i,o,n){var r=t.single_source_shortest_paths(i,o,n);return t.extract_shortest_path_from_predecessor_list(r,n)},PriorityQueue:{make:function(i){var o=t.PriorityQueue,n={},r;i=i||{};for(r in o)o.hasOwnProperty(r)&&(n[r]=o[r]);return n.queue=[],n.sorter=i.sorter||o.default_sorter,n},default_sorter:function(i,o){return i.cost-o.cost},push:function(i,o){var n={value:i,cost:o};this.queue.push(n),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return this.queue.length===0}}};e.exports=t})(It);var Zt=It.exports;(function(e){const t=L,i=Jt,o=Ot,n=Gt,r=Wt,s=N,c=T,a=Zt;function u(d){return unescape(encodeURIComponent(d)).length}function l(d,y,h){const g=[];let E;for(;(E=d.exec(h))!==null;)g.push({data:E[0],index:E.index,mode:y,length:E[0].length});return g}function C(d){const y=l(s.NUMERIC,t.NUMERIC,d),h=l(s.ALPHANUMERIC,t.ALPHANUMERIC,d);let g,E;return c.isKanjiModeEnabled()?(g=l(s.BYTE,t.BYTE,d),E=l(s.KANJI,t.KANJI,d)):(g=l(s.BYTE_KANJI,t.BYTE,d),E=[]),y.concat(h,g,E).sort(function(A,I){return A.index-I.index}).map(function(A){return{data:A.data,mode:A.mode,length:A.length}})}function m(d,y){switch(y){case t.NUMERIC:return i.getBitsLength(d);case t.ALPHANUMERIC:return o.getBitsLength(d);case t.KANJI:return r.getBitsLength(d);case t.BYTE:return n.getBitsLength(d)}}function f(d){return d.reduce(function(y,h){const g=y.length-1>=0?y[y.length-1]:null;return g&&g.mode===h.mode?(y[y.length-1].data+=h.data,y):(y.push(h),y)},[])}function w(d){const y=[];for(let h=0;h<d.length;h++){const g=d[h];switch(g.mode){case t.NUMERIC:y.push([g,{data:g.data,mode:t.ALPHANUMERIC,length:g.length},{data:g.data,mode:t.BYTE,length:g.length}]);break;case t.ALPHANUMERIC:y.push([g,{data:g.data,mode:t.BYTE,length:g.length}]);break;case t.KANJI:y.push([g,{data:g.data,mode:t.BYTE,length:u(g.data)}]);break;case t.BYTE:y.push([{data:g.data,mode:t.BYTE,length:u(g.data)}])}}return y}function p(d,y){const h={},g={start:{}};let E=["start"];for(let b=0;b<d.length;b++){const A=d[b],I=[];for(let S=0;S<A.length;S++){const M=A[S],v=""+b+S;I.push(v),h[v]={node:M,lastCount:0},g[v]={};for(let q=0;q<E.length;q++){const P=E[q];h[P]&&h[P].node.mode===M.mode?(g[P][v]=m(h[P].lastCount+M.length,M.mode)-m(h[P].lastCount,M.mode),h[P].lastCount+=M.length):(h[P]&&(h[P].lastCount=M.length),g[P][v]=m(M.length,M.mode)+4+t.getCharCountIndicator(M.mode,y))}}E=I}for(let b=0;b<E.length;b++)g[E[b]].end=0;return{map:g,table:h}}function B(d,y){let h;const g=t.getBestModeForData(d);if(h=t.from(y,g),h!==t.BYTE&&h.bit<g.bit)throw new Error('"'+d+'" cannot be encoded with mode '+t.toString(h)+`.
 Suggested mode is: `+t.toString(g));switch(h===t.KANJI&&!c.isKanjiModeEnabled()&&(h=t.BYTE),h){case t.NUMERIC:return new i(d);case t.ALPHANUMERIC:return new o(d);case t.KANJI:return new r(d);case t.BYTE:return new n(d)}}e.fromArray=function(y){return y.reduce(function(h,g){return typeof g=="string"?h.push(B(g,null)):g.data&&h.push(B(g.data,g.mode)),h},[])},e.fromString=function(y,h){const g=C(y,c.isKanjiModeEnabled()),E=w(g),b=p(E,h),A=a.find_path(b.map,"start","end"),I=[];for(let S=1;S<A.length-1;S++)I.push(b.table[A[S]].node);return e.fromArray(f(I))},e.rawSplit=function(y){return e.fromArray(C(y,c.isKanjiModeEnabled()))}})(Tt);const Q=T,Z=O,Xt=Dt,$t=kt,te=mt,ee=wt,nt=pt,ot=Y,ne=_t,J=Et,oe=Bt,re=L,X=Tt;function ie(e,t){const i=e.size,o=ee.getPositions(t);for(let n=0;n<o.length;n++){const r=o[n][0],s=o[n][1];for(let c=-1;c<=7;c++)if(!(r+c<=-1||i<=r+c))for(let a=-1;a<=7;a++)s+a<=-1||i<=s+a||(c>=0&&c<=6&&(a===0||a===6)||a>=0&&a<=6&&(c===0||c===6)||c>=2&&c<=4&&a>=2&&a<=4?e.set(r+c,s+a,!0,!0):e.set(r+c,s+a,!1,!0))}}function se(e){const t=e.size;for(let i=8;i<t-8;i++){const o=i%2===0;e.set(i,6,o,!0),e.set(6,i,o,!0)}}function ae(e,t){const i=te.getPositions(t);for(let o=0;o<i.length;o++){const n=i[o][0],r=i[o][1];for(let s=-2;s<=2;s++)for(let c=-2;c<=2;c++)s===-2||s===2||c===-2||c===2||s===0&&c===0?e.set(n+s,r+c,!0,!0):e.set(n+s,r+c,!1,!0)}}function ce(e,t){const i=e.size,o=J.getEncodedBits(t);let n,r,s;for(let c=0;c<18;c++)n=Math.floor(c/3),r=c%3+i-8-3,s=(o>>c&1)===1,e.set(n,r,s,!0),e.set(r,n,s,!0)}function $(e,t,i){const o=e.size,n=oe.getEncodedBits(t,i);let r,s;for(r=0;r<15;r++)s=(n>>r&1)===1,r<6?e.set(r,8,s,!0):r<8?e.set(r+1,8,s,!0):e.set(o-15+r,8,s,!0),r<8?e.set(8,o-r-1,s,!0):r<9?e.set(8,15-r-1+1,s,!0):e.set(8,15-r-1,s,!0);e.set(o-8,8,1,!0)}function le(e,t){const i=e.size;let o=-1,n=i-1,r=7,s=0;for(let c=i-1;c>0;c-=2)for(c===6&&c--;;){for(let a=0;a<2;a++)if(!e.isReserved(n,c-a)){let u=!1;s<t.length&&(u=(t[s]>>>r&1)===1),e.set(n,c-a,u),r--,r===-1&&(s++,r=7)}if(n+=o,n<0||i<=n){n-=o,o=-o;break}}}function ue(e,t,i){const o=new Xt;i.forEach(function(a){o.put(a.mode.bit,4),o.put(a.getLength(),re.getCharCountIndicator(a.mode,e)),a.write(o)});const n=Q.getSymbolTotalCodewords(e),r=ot.getTotalCodewordsCount(e,t),s=(n-r)*8;for(o.getLengthInBits()+4<=s&&o.put(0,4);o.getLengthInBits()%8!==0;)o.putBit(0);const c=(s-o.getLengthInBits())/8;for(let a=0;a<c;a++)o.put(a%2?17:236,8);return fe(o,e,t)}function fe(e,t,i){const o=Q.getSymbolTotalCodewords(t),n=ot.getTotalCodewordsCount(t,i),r=o-n,s=ot.getBlocksCount(t,i),c=o%s,a=s-c,u=Math.floor(o/s),l=Math.floor(r/s),C=l+1,m=u-l,f=new ne(m);let w=0;const p=new Array(s),B=new Array(s);let d=0;const y=new Uint8Array(e.buffer);for(let A=0;A<s;A++){const I=A<a?l:C;p[A]=y.slice(w,w+I),B[A]=f.encode(p[A]),w+=I,d=Math.max(d,I)}const h=new Uint8Array(o);let g=0,E,b;for(E=0;E<d;E++)for(b=0;b<s;b++)E<p[b].length&&(h[g++]=p[b][E]);for(E=0;E<m;E++)for(b=0;b<s;b++)h[g++]=B[b][E];return h}function de(e,t,i,o){let n;if(Array.isArray(e))n=X.fromArray(e);else if(typeof e=="string"){let u=t;if(!u){const l=X.rawSplit(e);u=J.getBestVersionForData(l,i)}n=X.fromString(e,u||40)}else throw new Error("Invalid data");const r=J.getBestVersionForData(n,i);if(!r)throw new Error("The amount of data is too big to be stored in a QR Code");if(!t)t=r;else if(t<r)throw new Error(`
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: `+r+`.
`);const s=ue(t,i,n),c=Q.getSymbolSize(t),a=new $t(c);return ie(a,t),se(a),ae(a,t),$(a,i,0),t>=7&&ce(a,t),le(a,s),isNaN(o)&&(o=nt.getBestMask(a,$.bind(null,a,i))),nt.applyMask(o,a),$(a,i,o),{modules:a,version:t,errorCorrectionLevel:i,maskPattern:o,segments:n}}gt.create=function(t,i){if(typeof t>"u"||t==="")throw new Error("No input text");let o=Z.M,n,r;return typeof i<"u"&&(o=Z.from(i.errorCorrectionLevel,Z.M),n=J.from(i.version),r=nt.from(i.maskPattern),i.toSJISFunc&&Q.setToSJISFunction(i.toSJISFunc)),de(t,n,o,r)};var Mt={},ct={};(function(e){function t(i){if(typeof i=="number"&&(i=i.toString()),typeof i!="string")throw new Error("Color should be defined as hex string");let o=i.slice().replace("#","").split("");if(o.length<3||o.length===5||o.length>8)throw new Error("Invalid hex color: "+i);(o.length===3||o.length===4)&&(o=Array.prototype.concat.apply([],o.map(function(r){return[r,r]}))),o.length===6&&o.push("F","F");const n=parseInt(o.join(""),16);return{r:n>>24&255,g:n>>16&255,b:n>>8&255,a:n&255,hex:"#"+o.slice(0,6).join("")}}e.getOptions=function(o){o||(o={}),o.color||(o.color={});const n=typeof o.margin>"u"||o.margin===null||o.margin<0?4:o.margin,r=o.width&&o.width>=21?o.width:void 0,s=o.scale||4;return{width:r,scale:r?4:s,margin:n,color:{dark:t(o.color.dark||"#000000ff"),light:t(o.color.light||"#ffffffff")},type:o.type,rendererOpts:o.rendererOpts||{}}},e.getScale=function(o,n){return n.width&&n.width>=o+n.margin*2?n.width/(o+n.margin*2):n.scale},e.getImageWidth=function(o,n){const r=e.getScale(o,n);return Math.floor((o+n.margin*2)*r)},e.qrToImageData=function(o,n,r){const s=n.modules.size,c=n.modules.data,a=e.getScale(s,r),u=Math.floor((s+r.margin*2)*a),l=r.margin*a,C=[r.color.light,r.color.dark];for(let m=0;m<u;m++)for(let f=0;f<u;f++){let w=(m*u+f)*4,p=r.color.light;if(m>=l&&f>=l&&m<u-l&&f<u-l){const B=Math.floor((m-l)/a),d=Math.floor((f-l)/a);p=C[c[B*s+d]?1:0]}o[w++]=p.r,o[w++]=p.g,o[w++]=p.b,o[w]=p.a}}})(ct);(function(e){const t=ct;function i(n,r,s){n.clearRect(0,0,r.width,r.height),r.style||(r.style={}),r.height=s,r.width=s,r.style.height=s+"px",r.style.width=s+"px"}function o(){try{return document.createElement("canvas")}catch{throw new Error("You need to specify a canvas element")}}e.render=function(r,s,c){let a=c,u=s;typeof a>"u"&&(!s||!s.getContext)&&(a=s,s=void 0),s||(u=o()),a=t.getOptions(a);const l=t.getImageWidth(r.modules.size,a),C=u.getContext("2d"),m=C.createImageData(l,l);return t.qrToImageData(m.data,r,a),i(C,u,l),C.putImageData(m,0,0),u},e.renderToDataURL=function(r,s,c){let a=c;typeof a>"u"&&(!s||!s.getContext)&&(a=s,s=void 0),a||(a={});const u=e.render(r,s,a),l=a.type||"image/png",C=a.rendererOpts||{};return u.toDataURL(l,C.quality)}})(Mt);var Nt={};const ge=ct;function dt(e,t){const i=e.a/255,o=t+'="'+e.hex+'"';return i<1?o+" "+t+'-opacity="'+i.toFixed(2).slice(1)+'"':o}function tt(e,t,i){let o=e+t;return typeof i<"u"&&(o+=" "+i),o}function he(e,t,i){let o="",n=0,r=!1,s=0;for(let c=0;c<e.length;c++){const a=Math.floor(c%t),u=Math.floor(c/t);!a&&!r&&(r=!0),e[c]?(s++,c>0&&a>0&&e[c-1]||(o+=r?tt("M",a+i,.5+u+i):tt("m",n,0),n=0,r=!1),a+1<t&&e[c+1]||(o+=tt("h",s),s=0)):n++}return o}Nt.render=function(t,i,o){const n=ge.getOptions(i),r=t.modules.size,s=t.modules.data,c=r+n.margin*2,a=n.color.light.a?"<path "+dt(n.color.light,"fill")+' d="M0 0h'+c+"v"+c+'H0z"/>':"",u="<path "+dt(n.color.dark,"stroke")+' d="'+he(s,r,n.margin)+'"/>',l='viewBox="0 0 '+c+" "+c+'"',m='<svg xmlns="http://www.w3.org/2000/svg" '+(n.width?'width="'+n.width+'" height="'+n.width+'" ':"")+l+' shape-rendering="crispEdges">'+a+u+`</svg>
`;return typeof o=="function"&&o(null,m),m};const me=Rt,rt=gt,Pt=Mt,we=Nt;function lt(e,t,i,o,n){const r=[].slice.call(arguments,1),s=r.length,c=typeof r[s-1]=="function";if(!c&&!me())throw new Error("Callback required as last argument");if(c){if(s<2)throw new Error("Too few arguments provided");s===2?(n=i,i=t,t=o=void 0):s===3&&(t.getContext&&typeof n>"u"?(n=o,o=void 0):(n=o,o=i,i=t,t=void 0))}else{if(s<1)throw new Error("Too few arguments provided");return s===1?(i=t,t=o=void 0):s===2&&!t.getContext&&(o=i,i=t,t=void 0),new Promise(function(a,u){try{const l=rt.create(i,o);a(e(l,t,o))}catch(l){u(l)}})}try{const a=rt.create(i,o);n(null,e(a,t,o))}catch(a){n(a)}}j.create=rt.create;j.toCanvas=lt.bind(null,Pt.render);j.toDataURL=lt.bind(null,Pt.renderToDataURL);j.toString=lt.bind(null,function(e,t,i){return we.render(e,i)});const pe=async e=>{try{const t=await fetch(e);if(!t.ok)return null;const i=await t.blob();return new Promise(o=>{const n=new FileReader;n.onloadend=()=>o(n.result),n.onerror=()=>o(null),n.readAsDataURL(i)})}catch{return null}},Ce=async({officeName:e,qrCodeDataUrl:t,orgName:i,orgLogoUrl:o,officeAddress:n,officeCity:r,officeCountry:s,orgPhone:c,orgEmail:a,orgWebsite:u})=>{let l=null;o&&(l=await pe(o));const C=window.open("","_blank");if(!C){alert("Please allow popups to download the QR code PDF");return}const m=St(new Date,"d MMMM yyyy"),f=i?.charAt(0)?.toUpperCase()||"O",w=[n,r,s].filter(Boolean),p=w.length>0?w.join(", "):null,B=[c,a,u?.replace(/^https?:\/\//,"")].filter(Boolean),d=B.length>0?B.join(" • "):null,y=`
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR Check-In - ${e}</title>
      <style>
        @page { 
          size: A4 portrait; 
          margin: 0; 
        }
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: white;
          color: #1e293b;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 35mm 20mm;
        }
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          width: 100%;
          max-width: 160mm;
        }
        .logo-container {
          margin-bottom: 28px;
        }
        .logo {
          max-height: 80px;
          max-width: 240px;
          object-fit: contain;
        }
        .logo-fallback {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: bold;
          color: white;
        }
        .divider {
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
          margin: 24px 0;
        }
        .office-name {
          font-size: 36pt;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
          line-height: 1.2;
        }
        .subtitle {
          font-size: 18pt;
          color: #64748b;
          margin-bottom: 12px;
        }
        .office-details {
          margin-bottom: 28px;
        }
        .office-address {
          font-size: 13pt;
          color: #64748b;
          max-width: 320px;
          line-height: 1.4;
        }
        .qr-container {
          background: white;
          padding: 24px;
          border-radius: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
          border: 2px solid #e2e8f0;
          margin-bottom: 36px;
        }
        .qr-code {
          width: 260px;
          height: 260px;
        }
        .instructions {
          font-size: 16pt;
          color: #334155;
          line-height: 1.6;
          max-width: 380px;
        }
        .instructions strong {
          color: #3b82f6;
        }
        .geofence-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #dcfce7;
          color: #16a34a;
          padding: 10px 20px;
          border-radius: 24px;
          font-size: 14pt;
          font-weight: 500;
          margin-top: 28px;
        }
        .geofence-icon {
          width: 20px;
          height: 20px;
        }
        .footer {
          position: fixed;
          bottom: 20mm;
          left: 0;
          right: 0;
          text-align: center;
        }
        .footer-divider {
          width: 160mm;
          height: 1px;
          background: #e2e8f0;
          margin: 0 auto 18px;
        }
        .footer-org {
          font-size: 14pt;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
        }
        .footer-contact {
          font-size: 11pt;
          color: #64748b;
          margin-bottom: 10px;
        }
        .footer-date {
          font-size: 10pt;
          color: #94a3b8;
        }
        @media print {
          body { 
            padding: 35mm 20mm;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo-container">
          ${l?`<img src="${l}" class="logo" alt="${i}" />`:`<div class="logo-fallback">${f}</div>`}
        </div>
        
        <div class="divider"></div>
        
        <h1 class="office-name">${e}</h1>
        <p class="subtitle">Check-In Station</p>
        
        ${p?`
          <div class="office-details">
            <p class="office-address">${p}</p>
          </div>
        `:""}
        
        <div class="qr-container">
          <img src="${t}" class="qr-code" alt="QR Code" />
        </div>
        
        <p class="instructions">
          Scan this QR code with <strong>GlobalyOS</strong> to check in or check out
        </p>
        
        <div class="geofence-badge">
          <svg class="geofence-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          100m Location Verified
        </div>
      </div>
      
      <div class="footer">
        <div class="footer-divider"></div>
        <p class="footer-org">${i}</p>
        ${d?`<p class="footer-contact">${d}</p>`:""}
        <p class="footer-date">Generated on ${m}</p>
      </div>
    </body>
    </html>
  `;C.document.write(y),C.document.close(),C.onload=()=>{setTimeout(()=>{C.print()},100)},setTimeout(()=>{C.print()},1e3)};export{j as b,Ce as g};
