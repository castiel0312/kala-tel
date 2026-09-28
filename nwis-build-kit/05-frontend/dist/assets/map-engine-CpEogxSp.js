const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/mapbox-uAfTz7z0.js","assets/vendor-B6Ddqo3Z.js","assets/mapbox-SlEcOltG.css"])))=>i.map(i=>d[i]);
var dm=Object.defineProperty;var hm=(n,e,t)=>e in n?dm(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t;var f=(n,e,t)=>hm(n,typeof e!="symbol"?e+"":e,t);import{P as na,S as ku,i as $u,_ as Bn,g as mm,M as ac,r as le}from"./vendor-B6Ddqo3Z.js";async function Vu(n,e,t,r){return r._parse(n,e,t,r)}function ze(n,e){if(!n)throw new Error(e||"loader assertion failed.")}const Hn=!!(typeof process!="object"||String(process)!=="[object process]"||process.browser),cc=typeof process<"u"&&process.version&&/v([0-9]*)/.exec(process.version);cc&&parseFloat(cc[1]);const Qi="4.5.2",pm=Qi[0]>="0"&&Qi[0]<="9"?`v${Qi}`:"";function gm(){const n=new na({id:"loaders.gl"});return globalThis.loaders||(globalThis.loaders={}),globalThis.loaders.log=n,globalThis.loaders.version=pm,globalThis.probe||(globalThis.probe={}),globalThis.probe.loaders=n,n}const bm=gm(),_m=n=>typeof n=="boolean",De=n=>typeof n=="function",_t=n=>n!==null&&typeof n=="object",lc=n=>_t(n)&&n.constructor==={}.constructor,Gu=n=>typeof SharedArrayBuffer<"u"&&n instanceof SharedArrayBuffer,ra=n=>_t(n)&&typeof n.byteLength=="number"&&typeof n.slice=="function",ym=n=>!!n&&De(n[Symbol.iterator]),vm=n=>!!n&&De(n[Symbol.asyncIterator]),yt=n=>typeof Response<"u"&&n instanceof Response||_t(n)&&De(n.arrayBuffer)&&De(n.text)&&De(n.json),vt=n=>typeof Blob<"u"&&n instanceof Blob,xm=n=>typeof ReadableStream<"u"&&n instanceof ReadableStream||_t(n)&&De(n.tee)&&De(n.cancel)&&De(n.getReader),Sm=n=>_t(n)&&De(n.read)&&De(n.pipe)&&_m(n.readable),zu=n=>xm(n)||Sm(n);function wm(n,e){return Wu(n||{},e)}function Wu(n,e,t=0){if(t>3)return e;const r={...n};for(const[i,s]of Object.entries(e))s&&typeof s=="object"&&!Array.isArray(s)?r[i]=Wu(r[i]||{},e[i],t+1):r[i]=e[i];return r}function Tm(n){var e;globalThis.loaders||(globalThis.loaders={}),(e=globalThis.loaders).modules||(e.modules={}),Object.assign(globalThis.loaders.modules,n)}function Em(n){var t,r;return((r=(t=globalThis.loaders)==null?void 0:t.modules)==null?void 0:r[n])||null}const Am="latest";function Rm(){var n;return(n=globalThis._loadersgl_)!=null&&n.version||(globalThis._loadersgl_=globalThis._loadersgl_||{},globalThis._loadersgl_.version="4.5.2"),globalThis._loadersgl_.version}const Hu=Rm();function We(n,e){if(!n)throw new Error(e||"loaders.gl assertion failed.")}const pe=typeof process!="object"||String(process)!=="[object process]"||process.browser,ia=typeof importScripts=="function",Im=typeof window<"u"&&typeof window.orientation<"u",uc=typeof process<"u"&&process.version&&/v([0-9]*)/.exec(process.version);uc&&parseFloat(uc[1]);class Mm{constructor(e,t){f(this,"name");f(this,"workerThread");f(this,"isRunning",!0);f(this,"result");f(this,"_resolve",()=>{});f(this,"_reject",()=>{});this.name=e,this.workerThread=t,this.result=new Promise((r,i)=>{this._resolve=r,this._reject=i})}postMessage(e,t){this.workerThread.postMessage({source:"loaders.gl",type:e,payload:t})}done(e){We(this.isRunning),this.isRunning=!1,this._resolve(e)}error(e){We(this.isRunning),this.isRunning=!1,this._reject(e)}}class Zi{terminate(){}}const Ji=new Map;function Lm(n){We(n.source&&!n.url||!n.source&&n.url);let e=Ji.get(n.source||n.url);return e||(n.url&&(e=Cm(n.url),Ji.set(n.url,e)),n.source&&(e=ju(n.source),Ji.set(n.source,e))),We(e),e}function Cm(n){if(!n.startsWith("http"))return n;const e=Pm(n);return ju(e)}function ju(n){const e=new Blob([n],{type:"application/javascript"});return URL.createObjectURL(e)}function Pm(n){return`try {
  importScripts('${n}');
} catch (error) {
  console.error(error);
  throw error;
}`}function Xu(n,e=!0,t){const r=t||new Set;if(n){if(fc(n))r.add(n);else if(fc(n.buffer))r.add(n.buffer);else if(!ArrayBuffer.isView(n)){if(e&&typeof n=="object")for(const i in n)Xu(n[i],e,r)}}return t===void 0?Array.from(r):[]}function fc(n){return n?n instanceof ArrayBuffer||typeof MessagePort<"u"&&n instanceof MessagePort||typeof ImageBitmap<"u"&&n instanceof ImageBitmap||typeof OffscreenCanvas<"u"&&n instanceof OffscreenCanvas:!1}const es=()=>{};class to{constructor(e){f(this,"name");f(this,"source");f(this,"url");f(this,"terminated",!1);f(this,"worker");f(this,"onMessage");f(this,"onError");f(this,"_loadableURL","");const{name:t,source:r,url:i}=e;We(r||i),this.name=t,this.source=r,this.url=i,this.onMessage=es,this.onError=s=>console.log(s),this.worker=pe?this._createBrowserWorker():this._createNodeWorker()}static isSupported(){return typeof Worker<"u"&&pe||typeof Zi<"u"&&!pe}destroy(){this.onMessage=es,this.onError=es,this.worker.terminate(),this.terminated=!0}get isRunning(){return!!this.onMessage}postMessage(e,t){t=t||Xu(e),this.worker.postMessage(e,t)}_getErrorFromErrorEvent(e){let t="Failed to load ";return t+=`worker ${this.name} from ${this.url}. `,e.message&&(t+=`${e.message} in `),e.lineno&&(t+=`:${e.lineno}:${e.colno}`),new Error(t)}_createBrowserWorker(){this._loadableURL=Lm({source:this.source,url:this.url});const e=new Worker(this._loadableURL,{name:this.name});return e.onmessage=t=>{t.data?this.onMessage(t.data):this.onError(new Error("No data received"))},e.onerror=t=>{this.onError(this._getErrorFromErrorEvent(t)),this.terminated=!0},e.onmessageerror=t=>console.error(t),e}_createNodeWorker(){let e;if(this.url){const r=this.url.includes(":/")||this.url.startsWith("/")?this.url:`./${this.url}`,i=this.url.endsWith(".ts")||this.url.endsWith(".mjs")?"module":"commonjs";e=new Zi(r,{eval:!1,type:i})}else if(this.source)e=new Zi(this.source,{eval:!0});else throw new Error("no worker");return e.on("message",t=>{this.onMessage(t)}),e.on("error",t=>{this.onError(t)}),e.on("exit",t=>{}),e}}class Bm{constructor(e){f(this,"name","unnamed");f(this,"source");f(this,"url");f(this,"maxConcurrency",1);f(this,"maxMobileConcurrency",1);f(this,"onDebug",()=>{});f(this,"reuseWorkers",!0);f(this,"props",{});f(this,"jobQueue",[]);f(this,"idleQueue",[]);f(this,"count",0);f(this,"isDestroyed",!1);this.source=e.source,this.url=e.url,this.setProps(e)}static isSupported(){return to.isSupported()}destroy(){this.idleQueue.forEach(e=>e.destroy()),this.isDestroyed=!0}setProps(e){this.props={...this.props,...e},e.name!==void 0&&(this.name=e.name),e.maxConcurrency!==void 0&&(this.maxConcurrency=e.maxConcurrency),e.maxMobileConcurrency!==void 0&&(this.maxMobileConcurrency=e.maxMobileConcurrency),e.reuseWorkers!==void 0&&(this.reuseWorkers=e.reuseWorkers),e.onDebug!==void 0&&(this.onDebug=e.onDebug)}async startJob(e,t=(i,s,o)=>i.done(o),r=(i,s)=>i.error(s)){const i=new Promise(s=>(this.jobQueue.push({name:e,onMessage:t,onError:r,onStart:s}),this));return this._startQueuedJob(),await i}async _startQueuedJob(){if(!this.jobQueue.length)return;const e=this._getAvailableWorker();if(!e)return;const t=this.jobQueue.shift();if(t){this.onDebug({message:"Starting job",name:t.name,workerThread:e,backlog:this.jobQueue.length});const r=new Mm(t.name,e);e.onMessage=i=>t.onMessage(r,i.type,i.payload),e.onError=i=>t.onError(r,i),t.onStart(r);try{await r.result}catch(i){console.error(`Worker exception: ${i}`)}finally{this.returnWorkerToQueue(e)}}}returnWorkerToQueue(e){!pe||this.isDestroyed||!this.reuseWorkers||this.count>this._getMaxConcurrency()?(e.destroy(),this.count--):this.idleQueue.push(e),this.isDestroyed||this._startQueuedJob()}_getAvailableWorker(){if(this.idleQueue.length>0)return this.idleQueue.shift()||null;if(this.count<this._getMaxConcurrency()){this.count++;const e=`${this.name.toLowerCase()} (#${this.count} of ${this.maxConcurrency})`;return new to({name:e,source:this.source,url:this.url})}return null}_getMaxConcurrency(){return Im?this.maxMobileConcurrency:this.maxConcurrency}}const Nm={maxConcurrency:3,maxMobileConcurrency:1,reuseWorkers:!0,onDebug:()=>{}},Ke=class Ke{constructor(e){f(this,"props");f(this,"workerPools",new Map);this.props={...Nm},this.setProps(e),this.workerPools=new Map}static isSupported(){return to.isSupported()}static getWorkerFarm(e={}){return Ke._workerFarm=Ke._workerFarm||new Ke({}),Ke._workerFarm.setProps(e),Ke._workerFarm}destroy(){for(const e of this.workerPools.values())e.destroy();this.workerPools=new Map}setProps(e){this.props={...this.props,...e};for(const t of this.workerPools.values())t.setProps(this._getWorkerPoolProps())}getWorkerPool(e){const{name:t,source:r,url:i}=e;let s=this.workerPools.get(t);return s||(s=new Bm({name:t,source:r,url:i}),s.setProps(this._getWorkerPoolProps()),this.workerPools.set(t,s)),s}_getWorkerPoolProps(){return{maxConcurrency:this.props.maxConcurrency,maxMobileConcurrency:this.props.maxMobileConcurrency,reuseWorkers:this.props.reuseWorkers,onDebug:this.props.onDebug}}};f(Ke,"_workerFarm");let Gr=Ke;function Om(n,e={}){var o;const t=e[n.id]||{},r=pe?n.workerFile||`${n.id}-worker.js`:`${n.id}-worker-node.js`;let i=t.workerUrl;if(!i&&n.id==="compression"&&(i=e.workerUrl),(e._workerType||((o=e==null?void 0:e.core)==null?void 0:o._workerType))==="test"&&(pe?i=`modules/${n.module}/dist/${r}`:i=`modules/${n.module}/src/workers/${n.id}-worker-node.ts`),!i){let a=n.version;a==="latest"&&(a=Am);const c=a?`@${a}`:"";i=`https://unpkg.com/@loaders.gl/${n.module}${c}/dist/${r}`}return We(i),i}function Fm(n,e=Hu){We(n,"no worker provided");const t=n.version;return!(!e||!t)}const ts={};function Ku(n={}){var i,s;const e=n.useLocalLibraries??((i=n.core)==null?void 0:i.useLocalLibraries),t=n.CDN??((s=n.core)==null?void 0:s.CDN),r=n.modules;return{...e!==void 0?{useLocalLibraries:e}:{},...t!==void 0?{CDN:t}:{},...r!==void 0?{modules:r}:{}}}async function Ve(n,e=null,t={},r=null){return e&&(n=Um(n,e,t,r)),ts[n]=ts[n]||Dm(n),await ts[n]}function Um(n,e,t={},r=null){if(t!=null&&t.core)throw new Error("loadLibrary: options.core must be pre-normalized");if(!t.useLocalLibraries&&n.startsWith("http"))return n;r=r||n;const i=t.modules||{};return i[r]?i[r]:pe?t.CDN?(We(t.CDN.startsWith("http")),`${t.CDN}/${e}@${Hu}/dist/libs/${r}`):ia?`../src/libs/${r}`:`modules/${e}/src/libs/${r}`:`modules/${e}/dist/libs/${r}`}async function Dm(n){if(n.endsWith("wasm"))return await $m(n);if(!pe){const{requireFromFile:t}=globalThis.loaders||{};try{const r=await(t==null?void 0:t(n));return r||!n.includes("/dist/libs/")?r:await(t==null?void 0:t(n.replace("/dist/libs/","/src/libs/")))}catch(r){if(n.includes("/dist/libs/"))try{return await(t==null?void 0:t(n.replace("/dist/libs/","/src/libs/")))}catch{}return console.error(r),null}}if(ia)return importScripts(n);const e=await Vm(n);return km(e,n)}function km(n,e){if(!pe){const{requireFromString:r}=globalThis.loaders||{};return r==null?void 0:r(n,e)}if(ia)return eval.call(globalThis,n),null;const t=document.createElement("script");t.id=e;try{t.appendChild(document.createTextNode(n))}catch{t.text=n}return document.body.appendChild(t),null}async function $m(n){const{readFileAsArrayBuffer:e}=globalThis.loaders||{};if(pe||!e||n.startsWith("http"))return await(await fetch(n)).arrayBuffer();try{return await e(n)}catch{if(n.includes("/dist/libs/"))return await e(n.replace("/dist/libs/","/src/libs/"));throw new Error(`Failed to load ArrayBuffer from ${n}`)}}async function Vm(n){const{readFileAsText:e}=globalThis.loaders||{};if(pe||!e||n.startsWith("http"))return await(await fetch(n)).text();try{return await e(n)}catch{if(n.includes("/dist/libs/"))return await e(n.replace("/dist/libs/","/src/libs/"));throw new Error(`Failed to load text from ${n}`)}}function Gm(n,e){var i,s;if(!Gr.isSupported())return!1;const t=(e==null?void 0:e._nodeWorkers)??((i=e==null?void 0:e.core)==null?void 0:i._nodeWorkers);if(!pe&&!t)return!1;const r=(e==null?void 0:e.worker)??((s=e==null?void 0:e.core)==null?void 0:s.worker);return!!(n.worker&&r)}async function zm(n,e,t,r,i){const s=n.id,o=Om(n,t),c=Gr.getWorkerFarm(t==null?void 0:t.core).getWorkerPool({name:s,url:o});t=JSON.parse(JSON.stringify(t||{})),t._workerLoaderId=n.id,r=JSON.parse(JSON.stringify(r||{}));const l=await c.startJob("process-on-worker",Wm.bind(null,i));return l.postMessage("process",{input:e,options:t,context:r}),await(await l.result).result}async function Wm(n,e,t,r){switch(t){case"done":e.done(r);break;case"error":e.error(new Error(r.error));break;case"process":const{id:i,input:s,options:o}=r;try{const a=await n(s,o);e.postMessage("done",{id:i,result:a})}catch(a){const c=a instanceof Error?a.message:"unknown error";e.postMessage("error",{id:i,error:c})}break;default:console.warn(`parse-with-worker unknown message ${t}`)}}function Hm(n,e=5){return typeof n=="string"?n.slice(0,e):ArrayBuffer.isView(n)?dc(n.buffer,n.byteOffset,e):n instanceof ArrayBuffer?dc(n,0,e):""}function dc(n,e,t){if(n.byteLength<=e+t)return"";const r=new DataView(n);let i="";for(let s=0;s<t;s++)i+=String.fromCharCode(r.getUint8(e+s));return i}function jm(n){try{return JSON.parse(n)}catch{throw new Error(`Failed to parse JSON from data starting with "${Hm(n)}"`)}}function Xm(n,e,t){if(t=t||n.byteLength,n.byteLength<t||e.byteLength<t)return!1;const r=new Uint8Array(n),i=new Uint8Array(e);for(let s=0;s<r.length;++s)if(r[s]!==i[s])return!1;return!0}function Km(...n){return qm(n)}function qm(n){const e=n.map(s=>s instanceof ArrayBuffer?new Uint8Array(s):s),t=e.reduce((s,o)=>s+o.byteLength,0),r=new Uint8Array(t);let i=0;for(const s of e)r.set(s,i),i+=s.byteLength;return r.buffer}function qu(n,e,t){const r=t!==void 0?new Uint8Array(n).subarray(e,e+t):new Uint8Array(n).subarray(e);return new Uint8Array(r).buffer}function jn(n,e){return ze(n>=0),ze(e>0),n+(e-1)&-4}function Ym(n,e,t){let r;if(n instanceof ArrayBuffer)r=new Uint8Array(n);else{const i=n.byteOffset,s=n.byteLength;r=new Uint8Array(n.buffer||n.arrayBuffer,i,s)}return e.set(r,t),t+jn(r.byteLength,4)}async function Qm(n){const e=[];for await(const t of n)e.push(Zm(t));return Km(...e)}function Zm(n){if(n instanceof ArrayBuffer)return n;if(ArrayBuffer.isView(n)){const{buffer:e,byteOffset:t,byteLength:r}=n;return hc(e,t,r)}return hc(n)}function hc(n,e=0,t=n.byteLength-e){const r=new Uint8Array(n,e,t),i=new Uint8Array(r.length);return i.set(r),i.buffer}let Jm="";const mc={};function ep(n){for(const e in mc)if(n.startsWith(e)){const t=mc[e];n=n.replace(e,t)}return!n.startsWith("http://")&&!n.startsWith("https://")&&(n=`${Jm}${n}`),n}function Yu(n){return n&&typeof n=="object"&&n.isBuffer}function sa(n){if(Yu(n))return n;if(n instanceof ArrayBuffer)return n;if(Gu(n))return Nn(n);if(ArrayBuffer.isView(n)){const e=n.buffer;return n.byteOffset===0&&n.byteLength===n.buffer.byteLength?e:e.slice(n.byteOffset,n.byteOffset+n.byteLength)}if(typeof n=="string"){const e=n;return new TextEncoder().encode(e).buffer}if(n&&typeof n=="object"&&n._toArrayBuffer)return n._toArrayBuffer();throw new Error("toArrayBuffer")}function Xn(n){if(n instanceof ArrayBuffer)return n;if(Gu(n))return Nn(n);const{buffer:e,byteOffset:t,byteLength:r}=n;return e instanceof ArrayBuffer&&t===0&&r===e.byteLength?e:Nn(e,t,r)}function Nn(n,e=0,t=n.byteLength-e){const r=new Uint8Array(n,e,t),i=new Uint8Array(r.length);return i.set(r),i.buffer}function tp(n){return ArrayBuffer.isView(n)?n:new Uint8Array(n)}function Qu(n){const e=n?n.lastIndexOf("/"):-1;return e>=0?n.substr(e+1):n}function Zu(n){const e=n?n.lastIndexOf("/"):-1;return e>=0?n.substr(0,e):""}class np extends Error{constructor(t,r){super(t);f(this,"reason");f(this,"url");f(this,"response");this.reason=r.reason,this.url=r.url,this.response=r.response}}const rp=/^data:([-\w.]+\/[-\w.+]+)(;|,)/,ip=/^([-\w.]+\/[-\w.+]+)/;function pc(n,e){return n.toLowerCase()===e.toLowerCase()}function sp(n){const e=ip.exec(n);return e?e[1]:n}function gc(n){const e=rp.exec(n);return e?e[1]:""}const Ju=/\?.*/;function op(n){const e=n.match(Ju);return e&&e[0]}function Mi(n){return n.replace(Ju,"")}function ap(n){if(n.length<50)return n;const e=n.slice(n.length-15);return`${n.substr(0,32)}...${e}`}function Li(n){return yt(n)?n.url:vt(n)?("name"in n?n.name:"")||"":typeof n=="string"?n:""}function Ci(n){if(yt(n)){const e=n.headers.get("content-type")||"",t=Mi(n.url);return sp(e)||gc(t)}return vt(n)?n.type||"":typeof n=="string"?gc(n):""}function cp(n){return yt(n)?n.headers["content-length"]||-1:vt(n)?n.size:typeof n=="string"?n.length:n instanceof ArrayBuffer||ArrayBuffer.isView(n)?n.byteLength:-1}async function ef(n){if(yt(n))return n;const e={},t=cp(n);t>=0&&(e["content-length"]=String(t));const r=Li(n),i=Ci(n);i&&(e["content-type"]=i);const s=await fp(n);s&&(e["x-first-bytes"]=s),typeof n=="string"&&(n=new TextEncoder().encode(n));const o=new Response(n,{headers:e});return Object.defineProperty(o,"url",{value:r}),o}async function lp(n){if(!n.ok)throw await up(n)}async function up(n){const e=ap(n.url);let t=`Failed to fetch resource (${n.status}) ${n.statusText}: ${e}`;t=t.length>100?`${t.slice(0,100)}...`:t;const r={reason:n.statusText,url:n.url,response:n};try{const i=n.headers.get("Content-Type");r.reason=!n.bodyUsed&&(i!=null&&i.includes("application/json"))?await n.json():await n.text()}catch{}return new np(t,r)}async function fp(n){if(typeof n=="string")return`data:,${n.slice(0,5)}`;if(n instanceof Blob){const t=n.slice(0,5);return await new Promise(r=>{const i=new FileReader;i.onload=s=>{var o;return r((o=s==null?void 0:s.target)==null?void 0:o.result)},i.readAsDataURL(t)})}if(n instanceof ArrayBuffer){const t=n.slice(0,5);return`data:base64,${dp(t)}`}return null}function dp(n){let e="";const t=new Uint8Array(n);for(let r=0;r<t.byteLength;r++)e+=String.fromCharCode(t[r]);return btoa(e)}function hp(n){return!mp(n)&&!pp(n)}function mp(n){return n.startsWith("http:")||n.startsWith("https:")}function pp(n){return n.startsWith("data:")}async function bc(n,e){var t,r;if(typeof n=="string"){const i=ep(n);return hp(i)&&(t=globalThis.loaders)!=null&&t.fetchNode?(r=globalThis.loaders)==null?void 0:r.fetchNode(i,e):await fetch(i,e)}return await ef(n)}const ir=new na({id:"loaders.gl"});class gp{log(){return()=>{}}info(){return()=>{}}warn(){return()=>{}}error(){return()=>{}}}class bp{constructor(){f(this,"console");this.console=console}log(...e){return this.console.log.bind(this.console,...e)}info(...e){return this.console.info.bind(this.console,...e)}warn(...e){return this.console.warn.bind(this.console,...e)}error(...e){return this.console.error.bind(this.console,...e)}}const no={core:{baseUrl:void 0,fetch:null,mimeType:void 0,fallbackMimeType:void 0,ignoreRegisteredLoaders:void 0,nothrow:!1,log:new bp,useLocalLibraries:!1,CDN:"https://unpkg.com/@loaders.gl",worker:!0,maxConcurrency:3,maxMobileConcurrency:1,reuseWorkers:Hn,_nodeWorkers:!1,_workerType:"",limit:0,_limitMB:0,batchSize:"auto",batchDebounceMs:0,metadata:!1,transforms:[]}},_p={baseUri:"core.baseUrl",fetch:"core.fetch",mimeType:"core.mimeType",fallbackMimeType:"core.fallbackMimeType",ignoreRegisteredLoaders:"core.ignoreRegisteredLoaders",nothrow:"core.nothrow",log:"core.log",useLocalLibraries:"core.useLocalLibraries",CDN:"core.CDN",worker:"core.worker",maxConcurrency:"core.maxConcurrency",maxMobileConcurrency:"core.maxMobileConcurrency",reuseWorkers:"core.reuseWorkers",_nodeWorkers:"core.nodeWorkers",_workerType:"core._workerType",_worker:"core._workerType",limit:"core.limit",_limitMB:"core._limitMB",batchSize:"core.batchSize",batchDebounceMs:"core.batchDebounceMs",metadata:"core.metadata",transforms:"core.transforms",throws:"nothrow",dataType:"(no longer used)",uri:"core.baseUrl",method:"core.fetch.method",headers:"core.fetch.headers",body:"core.fetch.body",mode:"core.fetch.mode",credentials:"core.fetch.credentials",cache:"core.fetch.cache",redirect:"core.fetch.redirect",referrer:"core.fetch.referrer",referrerPolicy:"core.fetch.referrerPolicy",integrity:"core.fetch.integrity",keepalive:"core.fetch.keepalive",signal:"core.fetch.signal"},oa=["baseUrl","fetch","mimeType","fallbackMimeType","ignoreRegisteredLoaders","nothrow","log","useLocalLibraries","CDN","worker","maxConcurrency","maxMobileConcurrency","reuseWorkers","_nodeWorkers","_workerType","limit","_limitMB","batchSize","batchDebounceMs","metadata","transforms"];function tf(){globalThis.loaders=globalThis.loaders||{};const{loaders:n}=globalThis;return n._state||(n._state={}),n._state}function nf(){const n=tf();return n.globalOptions=n.globalOptions||{...no,core:{...no.core}},ht(n.globalOptions)}function yp(n,e,t,r){return t=t||[],t=Array.isArray(t)?t:[t],vp(n,t),ht(Sp(e,n,r))}function ht(n){const e=Tp(n);rf(e);for(const t of oa)e.core&&e.core[t]!==void 0&&delete e[t];return e.core&&e.core._workerType!==void 0&&delete e._worker,e}function vp(n,e){_c(n,null,no,_p,e);for(const t of e){const r=n&&n[t.id]||{},i=t.options&&t.options[t.id]||{},s=t.deprecatedOptions&&t.deprecatedOptions[t.id]||{};_c(r,t.id,i,s,e)}}function _c(n,e,t,r,i){const s=e||"Top level",o=e?`${e}.`:"";for(const a in n){const c=!e&&_t(n[a]),l=a==="baseUri"&&!e,u=a==="workerUrl"&&e;if(!(a in t)&&!l&&!u){if(a in r)ir.level>0&&ir.warn(`${s} loader option '${o}${a}' no longer supported, use '${r[a]}'`)();else if(!c&&ir.level>0){const d=xp(a,i);ir.warn(`${s} loader option '${o}${a}' not recognized. ${d}`)()}}}}function xp(n,e){const t=n.toLowerCase();let r="";for(const i of e)for(const s in i.options){if(n===s)return`Did you mean '${i.id}.${s}'?`;const o=s.toLowerCase();(t.startsWith(o)||o.startsWith(t))&&(r=r||`Did you mean '${i.id}.${s}'?`)}return r}function Sp(n,e,t){var o;const r=n.options||{},i={...r};r.core&&(i.core={...r.core}),rf(i),((o=i.core)==null?void 0:o.log)===null&&(i.core={...i.core,log:new gp}),yc(i,ht(nf()));const s=ht(e);return yc(i,s),wp(i,t),Ep(i),i}function yc(n,e){for(const t in e)if(t in e){const r=e[t];lc(r)&&lc(n[t])?n[t]={...n[t],...e[t]}:n[t]=e[t]}}function wp(n,e){var r;if(!e)return;((r=n.core)==null?void 0:r.baseUrl)!==void 0||(n.core||(n.core={}),n.core.baseUrl=Zu(Mi(e)))}function Tp(n){const e={...n};return n.core&&(e.core={...n.core}),e}function rf(n){n.baseUri!==void 0&&(n.core||(n.core={}),n.core.baseUrl===void 0&&(n.core.baseUrl=n.baseUri));for(const t of oa)if(n[t]!==void 0){const i=n.core=n.core||{};i[t]===void 0&&(i[t]=n[t])}const e=n._worker;e!==void 0&&(n.core||(n.core={}),n.core._workerType===void 0&&(n.core._workerType=e))}function Ep(n){const e=n.core;if(e)for(const t of oa)e[t]!==void 0&&(n[t]=e[t])}function aa(n){return n?(Array.isArray(n)&&(n=n[0]),Array.isArray(n==null?void 0:n.extensions)):!1}function ca(n){ze(n,"null loader"),ze(aa(n),"invalid loader");let e;return Array.isArray(n)&&(e=n[1],n=n[0],n={...n,options:{...n.options,...e}}),(n!=null&&n.parseTextSync||n!=null&&n.parseText)&&(n.text=!0),n.text||(n.binary=!0),n}const sf=()=>{const n=tf();return n.loaderRegistry=n.loaderRegistry||[],n.loaderRegistry};function KC(n){const e=sf();n=Array.isArray(n)?n:[n];for(const t of n){const r=ca(t);e.find(i=>r===i)||e.unshift(r)}}function Ap(){return sf()}const Rp=/\.([^.]+)$/;async function Ip(n,e=[],t,r){if(!of(n))return null;const i=ht(t||{});if(i.core||(i.core={}),n instanceof Response&&vc(n)){const o=await n.clone().text(),a=sr(o,e,{...i,core:{...i.core,nothrow:!0}},r);if(a)return a}let s=sr(n,e,{...i,core:{...i.core,nothrow:!0}},r);if(s)return s;if(vt(n)&&(n=await n.slice(0,10).arrayBuffer(),s=sr(n,e,i,r)),!s&&n instanceof Response&&vc(n)){const o=await n.clone().text();s=sr(o,e,i,r)}if(!s&&!i.core.nothrow)throw new Error(af(n));return s}function vc(n){const e=Ci(n);return!!(e&&(e.startsWith("text/")||e==="application/json"||e.endsWith("+json")))}function sr(n,e=[],t,r){if(!of(n))return null;const i=ht(t||{});if(i.core||(i.core={}),e&&!Array.isArray(e))return ca(e);let s=[];e&&(s=s.concat(e)),i.core.ignoreRegisteredLoaders||s.push(...Ap()),Lp(s);const o=Mp(n,s,i,r);if(!o&&!i.core.nothrow)throw new Error(af(n));return o}function Mp(n,e,t,r){var l,u,d,h,m;const i=Li(n),s=Ci(n),o=Mi(i)||(r==null?void 0:r.url);let a=null,c="";return(l=t==null?void 0:t.core)!=null&&l.mimeType&&(a=ns(e,(u=t==null?void 0:t.core)==null?void 0:u.mimeType),c=`match forced by supplied MIME type ${(d=t==null?void 0:t.core)==null?void 0:d.mimeType}`),a=a||Cp(e,o),c=c||(a?`matched url ${o}`:""),a=a||ns(e,s),c=c||(a?`matched MIME type ${s}`:""),a=a||Bp(e,n),c=c||(a?`matched initial data ${cf(n)}`:""),(h=t==null?void 0:t.core)!=null&&h.fallbackMimeType&&(a=a||ns(e,(m=t==null?void 0:t.core)==null?void 0:m.fallbackMimeType),c=c||(a?`matched fallback MIME type ${s}`:"")),c&&bm.log(1,`selectLoader selected ${a==null?void 0:a.name}: ${c}.`),a}function of(n){return!(n instanceof Response&&n.status===204)}function af(n){const e=Li(n),t=Ci(n);let r="No valid loader found (";r+=e?`${Qu(e)}, `:"no url provided, ",r+=`MIME type: ${t?`"${t}"`:"not provided"}, `;const i=n?cf(n):"";return r+=i?` first bytes: "${i}"`:"first bytes: not available",r+=")",r}function Lp(n){for(const e of n)ca(e)}function Cp(n,e){const t=e&&Rp.exec(e),r=t&&t[1];return r?Pp(n,r):null}function Pp(n,e){e=e.toLowerCase();for(const t of n)for(const r of t.extensions)if(r.toLowerCase()===e)return t;return null}function ns(n,e){var t;for(const r of n)if((t=r.mimeTypes)!=null&&t.some(i=>pc(e,i))||pc(e,`application/x.${r.id}`))return r;return null}function Bp(n,e){if(!e)return null;for(const t of n)if(typeof e=="string"){if(Np(e,t))return t}else if(ArrayBuffer.isView(e)){if(xc(e.buffer,e.byteOffset,t))return t}else if(e instanceof ArrayBuffer&&xc(e,0,t))return t;return null}function Np(n,e){return e.testText?e.testText(n):(Array.isArray(e.tests)?e.tests:[e.tests]).some(r=>n.startsWith(r))}function xc(n,e,t){return(Array.isArray(t.tests)?t.tests:[t.tests]).some(i=>Op(n,e,t,i))}function Op(n,e,t,r){if(ra(r))return Xm(r,n,r.byteLength);switch(typeof r){case"function":return r(Xn(n));case"string":const i=ro(n,e,r.length);return r===i;default:return!1}}function cf(n,e=5){return typeof n=="string"?n.slice(0,e):ArrayBuffer.isView(n)?ro(n.buffer,n.byteOffset,e):n instanceof ArrayBuffer?ro(n,0,e):""}function ro(n,e,t){if(n.byteLength<e+t)return"";const r=new DataView(n);let i="";for(let s=0;s<t;s++)i+=String.fromCharCode(r.getUint8(e+s));return i}const Fp=256*1024;function*Up(n,e){const t=(e==null?void 0:e.chunkSize)||Fp;let r=0;const i=new TextEncoder;for(;r<n.length;){const s=Math.min(n.length-r,t),o=n.slice(r,r+s);r+=s,yield Xn(i.encode(o))}}const Dp=256*1024;function*kp(n,e={}){const{chunkSize:t=Dp}=e;let r=0;for(;r<n.byteLength;){const i=Math.min(n.byteLength-r,t),s=new ArrayBuffer(i),o=new Uint8Array(n,r,i);new Uint8Array(s).set(o),r+=i,yield s}}const $p=1024*1024;async function*Vp(n,e){const t=(e==null?void 0:e.chunkSize)||$p;let r=0;for(;r<n.size;){const i=r+t,s=await n.slice(r,i).arrayBuffer();r=i,yield s}}function Sc(n,e){return Hn?Gp(n,e):zp(n)}async function*Gp(n,e){const t=n.getReader();let r;try{for(;;){const i=r||t.read();e!=null&&e._streamReadAhead&&(r=t.read());const{done:s,value:o}=await i;if(s)return;yield sa(o)}}catch{t.releaseLock()}}async function*zp(n,e){for await(const t of n)yield sa(t)}function Wp(n,e){if(typeof n=="string")return Up(n,e);if(n instanceof ArrayBuffer)return kp(n,e);if(vt(n))return Vp(n,e);if(zu(n))return Sc(n,e);if(yt(n)){const t=n.body;if(!t)throw new Error("Readable stream not available on Response");return Sc(t,e)}throw new Error("makeIterator")}const lf="Cannot convert supplied data type";function Hp(n,e,t){if(e.text&&typeof n=="string")return n;if(Yu(n)&&(n=n.buffer),ra(n)){const r=tp(n);return e.text&&!e.binary?new TextDecoder("utf8").decode(r):sa(r)}throw new Error(lf)}async function jp(n,e,t){if(typeof n=="string"||ra(n))return Hp(n,e);if(vt(n)&&(n=await ef(n)),yt(n))return await lp(n),e.binary?await n.arrayBuffer():await n.text();if(zu(n)&&(n=Wp(n,t)),ym(n)||vm(n))return Qm(n);throw new Error(lf)}function uf(n,e){var s;const t=nf(),r=n||t,i=r.fetch??((s=r.core)==null?void 0:s.fetch);return typeof i=="function"?i:_t(i)?o=>bc(o,i):e!=null&&e.fetch?e==null?void 0:e.fetch:bc}function Xp(n,e,t){if(t)return t;const r={fetch:uf(e,n),...n};if(r.url){const i=Mi(r.url);r.baseUrl=i,r.queryString=op(r.url),r.filename=Qu(i),r.baseUrl=Zu(i)}return Array.isArray(r.loaders)||(r.loaders=null),r}function Kp(n,e){if(n&&!Array.isArray(n))return n;let t;if(n&&(t=Array.isArray(n)?n:[n]),e&&e.loaders){const r=Array.isArray(e.loaders)?e.loaders:[e.loaders];t=t?[...t,...r]:r}return t&&t.length?t:void 0}async function zr(n,e,t,r){e&&!Array.isArray(e)&&!aa(e)&&(r=void 0,t=e,e=void 0),n=await n,t=t||{};const i=Li(n),o=Kp(e,r),a=await Ip(n,o,t);if(!a)return null;const c=yp(t,a,o,i);return r=Xp({url:i,_parse:zr,loaders:o},c,r||null),await qp(a,n,c,r)}async function qp(n,e,t,r){if(Fm(n),t=wm(n.options,t),yt(e)){const{ok:s,redirected:o,status:a,statusText:c,type:l,url:u}=e,d=Object.fromEntries(e.headers.entries());r.response={headers:d,ok:s,redirected:o,status:a,statusText:c,type:l,url:u}}e=await jp(e,n,t);const i=n;if(i.parseTextSync&&typeof e=="string")return i.parseTextSync(e,t,r);if(Gm(n,t))return await zm(n,e,t,r,zr);if(i.parseText&&typeof e=="string")return await i.parseText(e,t,r);if(i.parse)return await i.parse(e,t,r);throw We(!i.parseSync),new Error(`${n.id} loader - no parser found and worker is disabled`)}function Yp(n){switch(n.constructor){case Int8Array:return"int8";case Uint8Array:case Uint8ClampedArray:return"uint8";case Int16Array:return"int16";case Uint16Array:return"uint16";case Int32Array:return"int32";case Uint32Array:return"uint32";case Float32Array:return"float32";case Float64Array:return"float64";default:return"null"}}function Qp(n){return ArrayBuffer.isView(n)&&!(n instanceof DataView)}function Zp(n){return Array.isArray(n)?n.length===0||typeof n[0]=="number":!1}function ff(n){return Qp(n)||Zp(n)}function Jp(n){let e=1/0,t=1/0,r=1/0,i=-1/0,s=-1/0,o=-1/0;const a=n.POSITION?n.POSITION.value:[],c=a&&a.length;for(let l=0;l<c;l+=3){const u=a[l],d=a[l+1],h=a[l+2];e=u<e?u:e,t=d<t?d:t,r=h<r?h:r,i=u>i?u:i,s=d>s?d:s,o=h>o?h:o}return[[e,t,r],[i,s,o]]}function eg(n,e,t){const r=Yp(e.value),i=t||tg(e);return{name:n,type:{type:"fixed-size-list",listSize:e.size,children:[{name:"value",type:r}]},nullable:!1,metadata:i}}function tg(n){const e={};return"byteOffset"in n&&(e.byteOffset=n.byteOffset.toString(10)),"byteStride"in n&&(e.byteStride=n.byteStride.toString(10)),"normalized"in n&&(e.normalized=n.normalized.toString()),e}async function qC(n,e,t,r){var c;let i,s;!Array.isArray(e)&&!aa(e)?(i=[],s=e):(i=e,s=t);const o=uf(s);let a=n;return typeof n=="string"&&(a=await o(n)),vt(n)&&(a=await o(n)),typeof n=="string"&&((c=ht(s||{}).core)!=null&&c.baseUrl||(s={...s,core:{...s==null?void 0:s.core,baseUrl:n}})),Array.isArray(i)?await zr(a,i,s):await zr(a,i,s)}const ng="4.5.2";var Du;const rg=(Du=globalThis.loaders)==null?void 0:Du.parseImageNode,io=typeof Image<"u",so=typeof ImageBitmap<"u",ig=!!rg,oo=Hn?!0:ig;function sg(n){switch(n){case"auto":return so||io||oo;case"imagebitmap":return so;case"image":return io;case"data":return oo;default:throw new Error(`@loaders.gl/images: image ${n} not supported in this environment`)}}function og(){if(so)return"imagebitmap";if(io)return"image";if(oo)return"data";throw new Error("Install '@loaders.gl/polyfills' to parse images under Node.js")}function ag(n){const e=cg(n);if(!e)throw new Error("Not an image");return e}function df(n){switch(ag(n)){case"data":return n;case"image":case"imagebitmap":const e=document.createElement("canvas"),t=e.getContext("2d");if(!t)throw new Error("getImageData");return e.width=n.width,e.height=n.height,t.drawImage(n,0,0),t.getImageData(0,0,n.width,n.height);default:throw new Error("getImageData")}}function cg(n){return typeof ImageBitmap<"u"&&n instanceof ImageBitmap?"imagebitmap":typeof Image<"u"&&n instanceof Image?"image":n&&typeof n=="object"&&n.data&&n.width&&n.height?"data":null}const lg=/^data:image\/svg\+xml/,ug=/\.svg((\?|#).*)?$/;function la(n){return n&&(lg.test(n)||ug.test(n))}function fg(n,e){if(la(e)){let r=new TextDecoder().decode(n);try{typeof unescape=="function"&&typeof encodeURIComponent=="function"&&(r=unescape(encodeURIComponent(r)))}catch(s){throw new Error(s.message)}return`data:image/svg+xml;base64,${btoa(r)}`}return hf(n,e)}function hf(n,e){if(la(e))throw new Error("SVG cannot be parsed directly to imagebitmap");return new Blob([new Uint8Array(n)])}async function mf(n,e,t){const r=fg(n,t),i=self.URL||self.webkitURL,s=typeof r!="string"&&i.createObjectURL(r);try{return await dg(s||r,e)}finally{s&&i.revokeObjectURL(s)}}async function dg(n,e){const t=new Image;return t.src=n,e.image&&e.image.decode&&t.decode?(await t.decode(),t):await new Promise((r,i)=>{try{t.onload=()=>r(t),t.onerror=s=>{const o=s instanceof Error?s.message:"error";i(new Error(o))}}catch(s){i(s)}})}let wc=!0;async function hg(n,e,t){let r;la(t)?r=await mf(n,e,t):r=hf(n,t);const i=e&&e.imagebitmap;return await mg(r,i)}async function mg(n,e=null){if((pg(e)||!wc)&&(e=null),e)try{return await createImageBitmap(n,e)}catch(t){console.warn(t),wc=!1}return await createImageBitmap(n)}function pg(n){if(!n)return!0;for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}function gg(n){return!vg(n,"ftyp",4)||(n[8]&96)===0?null:bg(n)}function bg(n){switch(_g(n,8,12).replace("\0"," ").trim()){case"avif":case"avis":return{extension:"avif",mimeType:"image/avif"};default:return null}}function _g(n,e,t){return String.fromCharCode(...n.slice(e,t))}function yg(n){return[...n].map(e=>e.charCodeAt(0))}function vg(n,e,t=0){const r=yg(e);for(let i=0;i<r.length;++i)if(r[i]!==n[i+t])return!1;return!0}const Fe=!1,bn=!0;function ua(n){const e=Kn(n);return Sg(e)||Eg(e)||wg(e)||Tg(e)||xg(e)}function xg(n){const e=new Uint8Array(n instanceof DataView?n.buffer:n),t=gg(e);return t?{mimeType:t.mimeType,width:0,height:0}:null}function Sg(n){const e=Kn(n);return e.byteLength>=24&&e.getUint32(0,Fe)===2303741511?{mimeType:"image/png",width:e.getUint32(16,Fe),height:e.getUint32(20,Fe)}:null}function wg(n){const e=Kn(n);return e.byteLength>=10&&e.getUint32(0,Fe)===1195984440?{mimeType:"image/gif",width:e.getUint16(6,bn),height:e.getUint16(8,bn)}:null}function Tg(n){const e=Kn(n);return e.byteLength>=14&&e.getUint16(0,Fe)===16973&&e.getUint32(2,bn)===e.byteLength?{mimeType:"image/bmp",width:e.getUint32(18,bn),height:e.getUint32(22,bn)}:null}function Eg(n){const e=Kn(n);if(!(e.byteLength>=3&&e.getUint16(0,Fe)===65496&&e.getUint8(2)===255))return null;const{tableMarkers:r,sofMarkers:i}=Ag();let s=2;for(;s+9<e.byteLength;){const o=e.getUint16(s,Fe);if(i.has(o))return{mimeType:"image/jpeg",height:e.getUint16(s+5,Fe),width:e.getUint16(s+7,Fe)};if(!r.has(o))return null;s+=2,s+=e.getUint16(s,Fe)}return null}function Ag(){const n=new Set([65499,65476,65484,65501,65534]);for(let t=65504;t<65520;++t)n.add(t);return{tableMarkers:n,sofMarkers:new Set([65472,65473,65474,65475,65477,65478,65479,65481,65482,65483,65485,65486,65487,65502])}}function Kn(n){if(n instanceof DataView)return n;if(ArrayBuffer.isView(n))return new DataView(n.buffer);if(n instanceof ArrayBuffer)return new DataView(n);throw new Error("toDataView")}async function Rg(n,e){var i;const{mimeType:t}=ua(n)||{},r=(i=globalThis.loaders)==null?void 0:i.parseImageNode;return ze(r),await r(n,t)}async function Ig(n,e,t){e=e||{};const i=(e.image||{}).type||"auto",{url:s}=t||{},o=Mg(i);let a;switch(o){case"imagebitmap":a=await hg(n,e,s);break;case"image":a=await mf(n,e,s);break;case"data":a=await Rg(n);break;default:ze(!1)}return i==="data"&&(a=df(a)),a}function Mg(n){switch(n){case"auto":case"data":return og();default:return sg(n),n}}const Lg=["png","jpg","jpeg","gif","webp","bmp","ico","svg","avif"],Cg=["image/png","image/jpeg","image/gif","image/webp","image/avif","image/bmp","image/vnd.microsoft.icon","image/svg+xml"],Pg={image:{type:"auto",decode:!0}},Bg={dataType:null,batchType:null,id:"image",module:"images",name:"Images",version:ng,mimeTypes:Cg,extensions:Lg,parse:Ig,tests:[n=>!!ua(new DataView(n))],options:Pg},Ng=["image/png","image/jpeg","image/gif","image/webp","image/avif","image/tiff","image/svg","image/svg+xml","image/bmp","image/vnd.microsoft.icon"];let or=null;async function Og(){return or?await or:(or=Fg(),await or)}async function Fg(){const n=new Set;for(const e of Ng)(Hn?await $g(e):pf(e))&&n.add(e);return n}const rs={};function Ug(n){if(rs[n]===void 0){const e=Hn?Dg(n):pf(n);rs[n]=e}return rs[n]}function pf(n){var i,s;const e=["image/png","image/jpeg","image/gif"],t=((i=globalThis.loaders)==null?void 0:i.imageFormatsNode)||e;return!!((s=globalThis.loaders)==null?void 0:s.parseImageNode)&&t.includes(n)}function Dg(n){switch(n){case"image/avif":case"image/webp":return Vg(n);default:return!0}}const kg={"image/avif":"data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=","image/webp":"data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA"};async function $g(n){const e=kg[n];return e?await Gg(e):!0}function Vg(n){try{return document.createElement("canvas").toDataURL(n).indexOf(`data:${n}`)===0}catch{return!1}}async function Gg(n){return new Promise(e=>{const t=new Image;t.src=n,t.onload=()=>e(t.height>0),t.onerror=()=>e(!1)})}const ye="(?:var<\\s*(uniform|storage(?:\\s*,\\s*[A-Za-z_][A-Za-z0-9_]*)?)\\s*>|var)\\s+([A-Za-z_][A-Za-z0-9_]*)",ve="\\s*",On=[new RegExp(`@binding\\(\\s*(auto|\\d+)\\s*\\)${ve}@group\\(\\s*(\\d+)\\s*\\)${ve}${ye}`,"g"),new RegExp(`@group\\(\\s*(\\d+)\\s*\\)${ve}@binding\\(\\s*(auto|\\d+)\\s*\\)${ve}${ye}`,"g")],ao=[new RegExp(`@binding\\(\\s*(auto|\\d+)\\s*\\)${ve}@group\\(\\s*(\\d+)\\s*\\)${ve}${ye}`,"g"),new RegExp(`@group\\(\\s*(\\d+)\\s*\\)${ve}@binding\\(\\s*(auto|\\d+)\\s*\\)${ve}${ye}`,"g")],zg=[new RegExp(`@binding\\(\\s*(\\d+)\\s*\\)${ve}@group\\(\\s*(\\d+)\\s*\\)${ve}${ye}`,"g"),new RegExp(`@group\\(\\s*(\\d+)\\s*\\)${ve}@binding\\(\\s*(\\d+)\\s*\\)${ve}${ye}`,"g")],Wg=[new RegExp(`@binding\\(\\s*(auto)\\s*\\)\\s*@group\\(\\s*(\\d+)\\s*\\)\\s*${ye}`,"g"),new RegExp(`@group\\(\\s*(\\d+)\\s*\\)\\s*@binding\\(\\s*(auto)\\s*\\)\\s*${ye}`,"g"),new RegExp(`@binding\\(\\s*(auto)\\s*\\)\\s*@group\\(\\s*(\\d+)\\s*\\)(?:[\\s\\n\\r]*@[A-Za-z_][^\\n\\r]*)*[\\s\\n\\r]*${ye}`,"g"),new RegExp(`@group\\(\\s*(\\d+)\\s*\\)\\s*@binding\\(\\s*(auto)\\s*\\)(?:[\\s\\n\\r]*@[A-Za-z_][^\\n\\r]*)*[\\s\\n\\r]*${ye}`,"g")];function Pi(n){const e=n.split("");let t=0,r=0,i=!1,s=!1,o=!1;for(;t<n.length;){const a=n[t],c=n[t+1];if(s){o?o=!1:a==="\\"?o=!0:a==='"'&&(s=!1),t++;continue}if(i){a===`
`||a==="\r"?i=!1:e[t]=" ",t++;continue}if(r>0){if(a==="/"&&c==="*"){e[t]=" ",e[t+1]=" ",r++,t+=2;continue}if(a==="*"&&c==="/"){e[t]=" ",e[t+1]=" ",r--,t+=2;continue}a!==`
`&&a!=="\r"&&(e[t]=" "),t++;continue}if(a==='"'){s=!0,t++;continue}if(a==="/"&&c==="/"){e[t]=" ",e[t+1]=" ",i=!0,t+=2;continue}if(a==="/"&&c==="*"){e[t]=" ",e[t+1]=" ",r=1,t+=2;continue}t++}return e.join("")}function Qt(n,e){var i;const t=Pi(n),r=[];for(const s of e){s.lastIndex=0;let o;for(o=s.exec(t);o;){const a=s===e[0],c=o.index,l=o[0].length;r.push({match:n.slice(c,c+l),index:c,length:l,bindingToken:o[a?1:2],groupToken:o[a?2:1],accessDeclaration:(i=o[3])==null?void 0:i.trim(),name:o[4]}),o=s.exec(t)}}return r.sort((s,o)=>s.index-o.index)}function gf(n,e,t){const r=Qt(n,e);if(!r.length)return n;let i="",s=0;for(const o of r)i+=n.slice(s,o.index),i+=t(o),s=o.index+o.length;return i+=n.slice(s),i}function bf(n){return/@binding\(\s*auto\s*\)/.test(Pi(n))}function Hg(n,e){return Qt(n,e===On||e===ao?Wg:e).find(r=>r.bindingToken==="auto")}function _f(n,e={}){const t=yf(n),r=jg(t);if(!r)return null;const i=Xg(t,r);if(!i)return null;const s=qg(t,r,i);if(!s)return null;if(e.scanVertexAttributes===!1)return{attributes:[],bindings:s};const o=Kg(t,r);if(!o)return null;const a=eb(t,r,i,o,e.vertexEntryPoint);return a?{attributes:a,bindings:s}:null}function yf(n){const e=Pi(n),t=/[A-Za-z_][A-Za-z0-9_]*|(?:0[xX][0-9A-Fa-f]+|\d+)|[@(){}<>\[\]:,;=]/g,r=[];let i=t.exec(e);for(;i;)r.push({value:i[0],index:i.index}),i=t.exec(e);return r}function jg(n){const e=[];let t=0;for(const r of n){if(r.value==="}"&&t===0)return null;e.push(t),r.value==="{"?t++:r.value==="}"&&t--}return t===0?e:null}function Xg(n,e){var r,i;const t=new Map;for(let s=0;s<n.length;s++){if(e[s]!==0||n[s].value!=="alias")continue;const o=(r=n[s+1])==null?void 0:r.value;if(!qn(o)||((i=n[s+2])==null?void 0:i.value)!=="="||t.has(o))return null;const a=Sf(n,e,s+3,";");if(a<0||a===s+3)return null;t.set(o,Wr(n.slice(s+3,a))),s=a}return t}function Kg(n,e){var r,i;const t=new Map;for(let s=0;s<n.length;s++){if(e[s]!==0||n[s].value!=="struct")continue;const o=(r=n[s+1])==null?void 0:r.value,a=s+2;if(!qn(o)||t.has(o)||((i=n[a])==null?void 0:i.value)!=="{")return null;const c=da(n,a,"{","}");if(c<0)return null;t.set(o,n.slice(a+1,c)),s=c}return t}function qg(n,e,t){var o,a,c;const r=[],i=new Set,s=new Set;for(let l=0;l<n.length;l++){if(e[l]!==0||n[l].value!=="var")continue;const u=wf(n,e,l),d=n.slice(u,l),h=co(d,"group"),m=co(d,"binding");if(h===null||m===null||h===void 0!=(m===void 0))return null;if(h===void 0||m===void 0)continue;let p=l+1,g=[];if(((o=n[p])==null?void 0:o.value)==="<"){const x=da(n,p,"<",">");if(x<0)return null;const T=Bi(n.slice(p+1,x),",");if(!T)return null;g=T.map(Wr),p=x+1}const b=(a=n[p])==null?void 0:a.value;if(!qn(b)||((c=n[p+1])==null?void 0:c.value)!==":")return null;const _=Sf(n,e,p+2,";");if(_<0||_===p+2)return null;const y=fa(Wr(n.slice(p+2,_)),t);if(!y)return null;const v=Yg({name:b,group:h,location:m,addressSpace:g,resourceType:y}),w=`${h}:${m}`;if(!v||i.has(w)||s.has(b))return null;r.push(v),i.add(w),s.add(b),l=_}return Jg(r),r.sort((l,u)=>l.group-u.group||l.location-u.location||l.name.localeCompare(u.name))}function Yg(n){const{name:e,group:t,location:r,addressSpace:i,resourceType:s}=n,o={name:e,group:t,location:r};if(i[0]==="uniform"&&i.length===1)return{...o,type:"uniform"};if(i[0]==="storage"&&i.length<=2){const a=i[1]||"read";return a==="read"?{...o,type:"read-only-storage"}:a==="read_write"?{...o,type:"storage"}:null}return i.length>0?null:s==="sampler"||s==="sampler_comparison"?{...o,type:"sampler",...s==="sampler_comparison"?{samplerType:"comparison"}:{}}:s==="texture_external"?{...o,type:"external-texture"}:Qg(o,s)||Zg(o,s)}function Qg(n,e){const t=/^texture_storage_(1d|2d|2d_array|3d)<([A-Za-z0-9_]+),(read|write|read_write)>$/.exec(e);if(!t)return null;const r={read:"read-only",write:"write-only",read_write:"read-write"}[t[3]];return{...n,type:"storage",format:t[2],access:r,viewDimension:lo(t[1])}}function Zg(n,e){const t=/^texture_(multisampled_)?(1d|2d|2d_array|cube|cube_array|3d)<(f32|i32|u32)>$/.exec(e);if(t){if(t[1]&&t[2]!=="2d")return null;const i={f32:"float",i32:"sint",u32:"uint"}[t[3]];return{...n,type:"texture",viewDimension:lo(t[2]),sampleType:i,multisampled:!!t[1]}}const r=/^texture_depth_(multisampled_)?(2d|2d_array|cube|cube_array)$/.exec(e);return!r||r[1]&&r[2]!=="2d"?null:{...n,type:"texture",viewDimension:lo(r[2]),sampleType:"depth",multisampled:!!r[1]}}function Jg(n){for(const e of n){if(e.type!=="sampler"||e.samplerType||!e.name.endsWith("Sampler"))continue;const t=e.name.slice(0,-7),r=n.find(i=>i.type==="texture"&&i.name===t&&i.group===e.group);(r==null?void 0:r.sampleType)==="depth"&&(e.samplerType="non-filtering")}}function eb(n,e,t,r,i){const s=tb(n,e);if(!s)return null;const o=s.filter(m=>m.vertex),a=i?o.find(m=>m.name===i):o.length===1?o[0]:void 0;if(!a)return o.length===0&&!i?[]:null;const c=Bi(a.parameters,",");if(!c)return null;const l=[],u=new Set,d=new Set,h=new Set;for(const m of c)if(m.length>0&&!vf({declaration:m,aliases:t,structures:r,attributes:l,attributeLocations:u,attributeNames:d,visitedStructures:h}))return null;return l.sort((m,p)=>m.location-p.location||m.name.localeCompare(p.name))}function tb(n,e){var i,s;const t=[],r=new Set;for(let o=0;o<n.length;o++){if(e[o]!==0||n[o].value!=="fn")continue;const a=(i=n[o+1])==null?void 0:i.value,c=o+2;if(!qn(a)||r.has(a)||((s=n[c])==null?void 0:s.value)!=="(")return null;const l=da(n,c,"(",")");if(l<0)return null;const u=wf(n,e,o);t.push({name:a,vertex:xf(n.slice(u,o),"vertex"),parameters:n.slice(c+1,l)}),r.add(a),o=l}return t}function vf(n){const{declaration:e,aliases:t,structures:r,attributes:i,attributeLocations:s,attributeNames:o,visitedStructures:a}=n,c=ib(e,":");if(c<1||c===e.length-1)return!1;const l=sb(e.slice(0,c)),u=co(e.slice(0,c),"location"),d=xf(e.slice(0,c),"builtin"),h=fa(Wr(e.slice(c+1)),t);if(!l||u===null||!h||u!==void 0&&d)return!1;if(u!==void 0){const g=rb(h);return!g||s.has(u)||o.has(l)?!1:(i.push({name:l,location:u,type:g}),s.add(u),o.add(l),!0)}if(d)return!0;const m=r.get(h);if(!m||a.has(h))return!1;const p=Bi(m,",");if(!p)return!1;a.add(h);for(const g of p)if(g.length>0&&!vf({...n,declaration:g}))return!1;return a.delete(h),!0}function fa(n,e,t=new Set){const r=yf(n);let i="";for(const s of r){const o=e.get(s.value);if(!o){i+=nb(s.value);continue}if(t.has(s.value))return null;const a=new Set(t);a.add(s.value);const c=fa(o,e,a);if(!c)return null;i+=c}return i}function nb(n){const e=/^(vec[234]|mat[234]x[234])([fiuh])$/.exec(n);if(!e)return n;const t={f:"f32",i:"i32",u:"u32",h:"f16"}[e[2]];return`${e[1]}<${t}>`}function rb(n){return/^(?:i32|u32|f32|f16|vec[234]<(?:i32|u32|f32|f16)>)$/.test(n)?n:null}function co(n,e){var r,i,s,o;let t;for(let a=0;a<n.length;a++)if(!(n[a].value!=="@"||((r=n[a+1])==null?void 0:r.value)!==e)){if(t!==void 0||((i=n[a+2])==null?void 0:i.value)!=="("||!/^\d+$/.test(((s=n[a+3])==null?void 0:s.value)||"")||((o=n[a+4])==null?void 0:o.value)!==")")return null;t=Number(n[a+3].value)}return t}function xf(n,e){return n.some((t,r)=>{var i;return t.value==="@"&&((i=n[r+1])==null?void 0:i.value)===e})}function lo(n){return n.replace("_","-")}function da(n,e,t,r){let i=0;for(let s=e;s<n.length;s++)if(n[s].value===t)i++;else if(n[s].value===r&&--i===0)return s;return-1}function Bi(n,e){const t=[];let r=0;const i={"(":0,"<":0,"[":0,"{":0},s=Object.keys(i),o={")":"(",">":"<","]":"[","}":"{"};for(let a=0;a<n.length;a++){const c=n[a].value;if(c===e&&s.every(l=>i[l]===0)){t.push(n.slice(r,a)),r=a+1;continue}if(c in i)i[c]++;else if(c in o){const l=o[c];if(i[l]--,i[l]<0)return null}}return s.every(a=>i[a]===0)?(t.push(n.slice(r)),t):null}function ib(n,e){const t=Bi(n,e);return t&&t.length===2?t[0].length:-1}function Sf(n,e,t,r){for(let i=t;i<n.length;i++)if(e[i]===0&&n[i].value===r)return i;return-1}function wf(n,e,t){for(let r=t-1;r>=0;r--)if(n[r].value===";"&&e[r]===0||n[r].value==="}"&&e[r]===1)return r+1;return 0}function sb(n){for(let e=n.length-1;e>=0;e--)if(qn(n[e].value))return n[e].value;return null}function Wr(n){return n.map(e=>e.value).join("")}function qn(n){return!!(n&&/^[A-Za-z_][A-Za-z0-9_]*$/.test(n))}function Zt(n,e){var t;if(!n){const r=new Error(e||"shadertools: assertion failed.");throw(t=Error.captureStackTrace)==null||t.call(Error,r,Zt),r}}const is={number:{type:"number",validate(n,e){return Number.isFinite(n)&&typeof e=="object"&&(e.max===void 0||n<=e.max)&&(e.min===void 0||n>=e.min)}},array:{type:"array",validate(n,e){return Array.isArray(n)||ArrayBuffer.isView(n)}}};function ob(n){const e={};for(const[t,r]of Object.entries(n))e[t]=ab(r);return e}function ab(n){let e=Tc(n);if(e!=="object")return{value:n,...is[e],type:e};if(typeof n=="object")return n?n.type!==void 0?{...n,...is[n.type],type:n.type}:n.value===void 0?{type:"object",value:n}:(e=Tc(n.value),{...n,...is[e],type:e}):{type:"object",value:null};throw new Error("props")}function Tc(n){return Array.isArray(n)||ArrayBuffer.isView(n)?"array":typeof n}const cb=`#ifdef MODULE_LOGDEPTH
  logdepth_adjustPosition(gl_Position);
#endif
`,lb=`#ifdef MODULE_MATERIAL
  fragColor = material_filterColor(fragColor);
#endif

#ifdef MODULE_LIGHTING
  fragColor = lighting_filterColor(fragColor);
#endif

#ifdef MODULE_FOG
  fragColor = fog_filterColor(fragColor);
#endif

#ifdef MODULE_PICKING
  fragColor = picking_filterHighlightColor(fragColor);
  fragColor = picking_filterPickingColor(fragColor);
#endif

#ifdef MODULE_LOGDEPTH
  logdepth_setFragDepth();
#endif
`,ub={vertex:cb,fragment:lb},Ec=/void\s+main\s*\([^)]*\)\s*\{\n?/,Ac=/}\n?[^{}]*$/,ss=[],Or="__LUMA_INJECT_DECLARATIONS__";function fb(n){const e={vertex:{},fragment:{}};for(const t in n){let r=n[t];const i=db(t);typeof r=="string"&&(r={order:0,injection:r}),e[i][t]=r}return e}function db(n){const e=n.slice(0,2);switch(e){case"vs":return"vertex";case"fs":return"fragment";default:throw new Error(e)}}function Hr(n,e,t,r=!1,i="glsl",s={}){const o=e==="vertex";for(const a in t){const c=t[a];c.sort((u,d)=>u.order-d.order),ss.length=c.length;for(let u=0,d=c.length;u<d;++u)ss[u]=c[u].injection;const l=`${ss.join(`
`)}
`;switch(a){case"vs:#decl":(i==="wgsl"||o)&&(n=n.replace(Or,l));break;case"vs:#main-start":(i==="wgsl"||o)&&(n=i==="wgsl"?ar(n,"vertex",l,"start",s.vertex):n.replace(Ec,u=>u+l));break;case"vs:#main-end":(i==="wgsl"||o)&&(n=i==="wgsl"?ar(n,"vertex",l,"end",s.vertex):n.replace(Ac,u=>l+u));break;case"fs:#decl":(i==="wgsl"||!o)&&(n=n.replace(Or,l));break;case"fs:#main-start":(i==="wgsl"||!o)&&(n=i==="wgsl"?ar(n,"fragment",l,"start",s.fragment):n.replace(Ec,u=>u+l));break;case"fs:#main-end":(i==="wgsl"||!o)&&(n=i==="wgsl"?ar(n,"fragment",l,"end",s.fragment):n.replace(Ac,u=>l+u));break;default:n=n.replace(a,u=>u+l)}}return n=n.replace(Or,""),r&&(n=n.replace(/\}\s*$/,a=>a+ub[e])),n}function ar(n,e,t,r,i){const s=hb(n,e,i);if(!s)return n;if(r==="start"){const o=s.openBraceIndex+1;return`${n.slice(0,o)}
${t}${n.slice(o)}`}return`${n.slice(0,s.closeBraceIndex)}${t}${n.slice(s.closeBraceIndex)}`}function hb(n,e,t){const r=e==="vertex"?"@vertex":"@fragment",i=n.indexOf(r);if(i<0)return null;const s=t?n.search(new RegExp(`\\bfn\\s+${mb(t)}\\s*\\(`)):n.indexOf("fn",i);if(s<0)return null;const o=n.indexOf("{",s);if(o<0)return null;let a=0;for(let c=o;c<n.length;c++){const l=n[c];if(l==="{")a++;else if(l==="}"&&(a--,a===0))return{openBraceIndex:o,closeBraceIndex:c}}return null}function mb(n){return n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function jr(n){n.map(e=>pb(e))}function pb(n){if(n.instance)return;jr(n.dependencies||[]);const{propTypes:e={},deprecations:t=[],inject:r={}}=n,i={normalizedInjections:fb(r),parsedDeprecations:gb(t)};e&&(i.propValidators=ob(e)),n.instance=i;let s={};e&&(s=Object.entries(e).reduce((o,[a,c])=>{const l=c==null?void 0:c.value;return l&&(o[a]=l),o},{})),n.defaultUniforms={...n.defaultUniforms,...s}}function Tf(n,e,t){var r;(r=n.deprecations)==null||r.forEach(i=>{var s;(s=i.regex)!=null&&s.test(e)&&(i.deprecated?t.deprecated(i.old,i.new)():t.removed(i.old,i.new)())})}function gb(n){return n.forEach(e=>{switch(e.type){case"function":e.regex=new RegExp(`\\b${e.old}\\(`);break;default:e.regex=new RegExp(`${e.type} ${e.old};`)}}),n}function Xr(n){jr(n);const e={},t={};Ef({modules:n,level:0,moduleMap:e,moduleDepth:t});const r=Object.keys(t).sort((i,s)=>t[s]-t[i]).map(i=>e[i]);return jr(r),r}function Ef(n){const{modules:e,level:t,moduleMap:r,moduleDepth:i}=n;if(t>=5)throw new Error("Possible loop in shader dependency graph");for(const s of e)r[s.name]=s,(i[s.name]===void 0||i[s.name]<t)&&(i[s.name]=t);for(const s of e)s.dependencies&&Ef({modules:s.dependencies,level:t+1,moduleMap:r,moduleDepth:i})}const S=new na({id:"luma.gl"}),Af={id:null,powerPreference:"high-performance",failIfMajorPerformanceCaveat:!1,featureLevel:void 0,optionalFeatures:[],xrCompatible:!1,createCanvasContext:void 0,webgl:{},onError:(n,e)=>{},onResize:(n,e)=>{const[t,r]=n.getDevicePixelSize();S.log(1,`${n} resized => ${t}x${r}px`)()},onPositionChange:(n,e)=>{const[t,r]=n.getPosition();S.log(1,`${n} repositioned => ${t},${r}`)()},onVisibilityChange:n=>S.log(1,`${n} Visibility changed ${n.isVisible}`)(),onDevicePixelRatioChange:(n,e)=>S.log(1,`${n} DPR changed ${e.oldRatio} => ${n.devicePixelRatio}`)(),debug:_b(),debugGPUTime:!1,debugShaders:S.get("debug-shaders")||void 0,debugFramebuffers:!!S.get("debug-framebuffers"),debugFactories:!!S.get("debug-factories"),debugWebGL:!!S.get("debug-webgl"),debugSpectorJS:void 0,debugSpectorJSUrl:void 0,_reuseDevices:!1,_cacheShaders:!0,_destroyShaders:!1,_cachePipelines:!0,_sharePipelines:!0,_destroyPipelines:!1,_initializeFeatures:!0,_disabledFeatures:{"compilation-status-async-webgl":!0},_handle:void 0};function bb(n,e){return n!=null?!!n:e!==void 0?e!=="production":!1}function _b(){return bb(S.get("debug"),yb())}function yb(){const n=globalThis.process;if(n!=null&&n.env)return n.env.NODE_ENV}const vb="GPU Time and Memory",xb=["Adapter","GPU","GPU Type","GPU Backend","Frame Rate","CPU Time","GPU Time","GPU Memory","Buffer Memory","Texture Memory","External Buffer Memory","External Texture Memory","Swap Chain Texture"],Rc=new WeakMap,Ic=new WeakMap;class Sb{constructor(){f(this,"stats",new Map)}getStats(e){return this.get(e)}get(e){this.stats.has(e)||this.stats.set(e,new ku({id:e}));const t=this.stats.get(e);return e===vb&&wb(t,xb),t}}const Rf=new Sb;function wb(n,e){const t=n.stats;let r=!1;for(const c of e)t[c]||(n.get(c),r=!0);const i=Object.keys(t).length,s=Rc.get(n);if(!r&&(s==null?void 0:s.orderedStatNames)===e&&s.statCount===i)return;const o={};let a=Ic.get(e);a||(a=new Set(e),Ic.set(e,a));for(const c of e)t[c]&&(o[c]=t[c]);for(const[c,l]of Object.entries(t))a.has(c)||(o[c]=l);for(const c of Object.keys(t))delete t[c];Object.assign(t,o),Rc.set(n,{orderedStatNames:e,statCount:i})}const Tb="set luma.log.level=1 (or higher) to trace rendering",Mc="No matching device found. Ensure `@luma.gl/webgl` and/or `@luma.gl/webgpu` modules are imported.",In=class In{constructor(){f(this,"stats",Rf);f(this,"log",S);f(this,"VERSION","9.4.2");f(this,"spector");f(this,"preregisteredAdapters",new Map);if(globalThis.luma){if(globalThis.luma.VERSION!==this.VERSION)throw S.error(`Found luma.gl ${globalThis.luma.VERSION} while initialzing ${this.VERSION}`)(),S.error("'yarn why @luma.gl/core' can help identify the source of the conflict")(),new Error("luma.gl - multiple versions detected: see console log");S.error("This version of luma.gl has already been initialized")()}S.log(1,`${this.VERSION} - ${Tb}`)(),globalThis.luma=this}async createDevice(e={}){const t={...In.defaultProps,...e},r=this.selectAdapter(t.type,t.adapters);if(!r)throw new Error(Mc);return t.waitForPageLoad&&await r.pageLoaded,await r.create(t)}async attachDevice(e,t){var s;const r=this._getTypeFromHandle(e,t.adapters),i=r&&this.selectAdapter(r,t.adapters);if(!i)throw new Error(Mc);return await((s=i==null?void 0:i.attach)==null?void 0:s.call(i,e,t))}registerAdapters(e){for(const t of e)this.preregisteredAdapters.set(t.type,t)}getSupportedAdapters(e=[]){const t=this._getAdapterMap(e);return Array.from(t).map(([,r])=>r).filter(r=>{var i;return(i=r.isSupported)==null?void 0:i.call(r)}).map(r=>r.type)}getBestAvailableAdapterType(e=[]){var i,s;const t=["webgpu","webgl","null"],r=this._getAdapterMap(e);for(const o of t)if((s=(i=r.get(o))==null?void 0:i.isSupported)!=null&&s.call(i))return o;return null}selectAdapter(e,t=[]){let r=e;e==="best-available"&&(r=this.getBestAvailableAdapterType(t));const i=this._getAdapterMap(t);return r&&i.get(r)||null}enforceWebGL2(e=!0,t=[]){var s;const i=this._getAdapterMap(t).get("webgl");i||S.warn("enforceWebGL2: webgl adapter not found")(),(s=i==null?void 0:i.enforceWebGL2)==null||s.call(i,e)}setDefaultDeviceProps(e){Object.assign(In.defaultProps,e)}_getAdapterMap(e=[]){const t=new Map(this.preregisteredAdapters);for(const r of e)t.set(r.type,r);return t}_getTypeFromHandle(e,t=[]){return e instanceof WebGL2RenderingContext?"webgl":typeof GPUDevice<"u"&&e instanceof GPUDevice||e!=null&&e.queue?"webgpu":e===null?"null":(e instanceof WebGLRenderingContext?S.warn("WebGL1 is not supported",e)():S.warn("Unknown handle type",e)(),null)}};f(In,"defaultProps",{...Af,type:"best-available",adapters:void 0,waitForPageLoad:!0});let uo=In;const Eb=new uo;class Ab{get pageLoaded(){return Mb()}}const Rb=$u()&&typeof document<"u",Ib=()=>Rb&&document.readyState==="complete";let cr=null;function Mb(){return cr||(Ib()||typeof window>"u"?cr=Promise.resolve():cr=new Promise(n=>window.addEventListener("load",()=>n()))),cr}const os={};function Yn(n="id"){os[n]=os[n]||1;const e=os[n]++;return`${n}-${e}`}const Lb="cpu-hotspot-profiler",Lc="GPU Resource Counts",Cc="Resource Counts",Pc="GPU Time and Memory",Cb=["Resources","Buffers","Textures","Samplers","TextureViews","Framebuffers","QuerySets","Shaders","RenderPipelines","ComputePipelines","PipelineLayouts","VertexArrays","RenderPasss","RenderBundleEncoders","RenderBundles","ComputePasss","CommandEncoders","CommandBuffers"],Pb=["Resources","Buffers","Textures","Samplers","TextureViews","Framebuffers","QuerySets","Shaders","RenderPipelines","SharedRenderPipelines","ComputePipelines","PipelineLayouts","VertexArrays","RenderPasss","RenderBundleEncoders","RenderBundles","ComputePasss","CommandEncoders","CommandBuffers"],Bb=Cb.flatMap(n=>[`${n} Created`,`${n} Active`]),Nb=Pb.flatMap(n=>[`${n} Created`,`${n} Active`]),Bc=new WeakMap,Nc=new WeakMap;class D{constructor(e,t,r){f(this,"id");f(this,"props");f(this,"userData",{});f(this,"_device");f(this,"destroyed",!1);f(this,"allocatedBytes",0);f(this,"allocatedBytesName",null);f(this,"_attachedResources",new Set);if(!e)throw new Error("no device");this._device=e,this.props=Ob(t,r);const i=this.props.id!=="undefined"?this.props.id:Yn(this[Symbol.toStringTag]);this.props.id=i,this.id=i,this.userData=this.props.userData||{},this.addStats()}toString(){return`${this[Symbol.toStringTag]||this.constructor.name}:"${this.id}"`}toJSON(){return this.toString()}get ownsHandle(){return(this.props.handle===void 0||this.props.handle===null)&&!this.isHandleBorrowed}get isHandleBorrowed(){return!!this.props._isHandleBorrowed}destroy(){this.destroyed||this.destroyResource()}delete(){return this.destroy(),this}getProps(){return this.props}attachResource(e){this._attachedResources.add(e)}detachResource(e){this._attachedResources.delete(e)}destroyAttachedResource(e){this._attachedResources.delete(e)&&e.destroy()}destroyAttachedResources(){for(const e of this._attachedResources)e.destroy();this._attachedResources=new Set}destroyResource(){this.destroyed||(this.destroyAttachedResources(),this.removeStats(),this.destroyed=!0)}removeStats(){const e=hn(this._device),t=e?je():0,r=[this._device.statsManager.getStats(Lc),this._device.statsManager.getStats(Cc)],i=Fc(this._device);for(const o of r)Oc(o,i);const s=this.getStatsName();for(const o of r)o.get("Resources Active").decrementCount(),o.get(`${s}s Active`).decrementCount();e&&(e.statsBookkeepingCalls=(e.statsBookkeepingCalls||0)+1,e.statsBookkeepingTimeMs=(e.statsBookkeepingTimeMs||0)+(je()-t))}trackAllocatedMemory(e,t=this.getStatsName()){const r=hn(this._device),i=r?je():0,s=this._device.statsManager.getStats(Pc);this.allocatedBytes>0&&this.allocatedBytesName&&(s.get("GPU Memory").subtractCount(this.allocatedBytes),s.get(`${this.allocatedBytesName} Memory`).subtractCount(this.allocatedBytes)),s.get("GPU Memory").addCount(e),s.get(`${t} Memory`).addCount(e),r&&(r.statsBookkeepingCalls=(r.statsBookkeepingCalls||0)+1,r.statsBookkeepingTimeMs=(r.statsBookkeepingTimeMs||0)+(je()-i)),this.allocatedBytes=e,this.allocatedBytesName=t}trackReferencedMemory(e,t=this.getStatsName()){this.trackAllocatedMemory(e,`External ${t}`)}trackDeallocatedMemory(e=this.getStatsName()){if(this.allocatedBytes===0){this.allocatedBytesName=null;return}const t=hn(this._device),r=t?je():0,i=this._device.statsManager.getStats(Pc);i.get("GPU Memory").subtractCount(this.allocatedBytes),i.get(`${this.allocatedBytesName||e} Memory`).subtractCount(this.allocatedBytes),t&&(t.statsBookkeepingCalls=(t.statsBookkeepingCalls||0)+1,t.statsBookkeepingTimeMs=(t.statsBookkeepingTimeMs||0)+(je()-r)),this.allocatedBytes=0,this.allocatedBytesName=null}trackDeallocatedReferencedMemory(e=this.getStatsName()){this.trackDeallocatedMemory(`Referenced ${e}`)}addStats(){const e=this.getStatsName(),t=hn(this._device),r=t?je():0,i=[this._device.statsManager.getStats(Lc),this._device.statsManager.getStats(Cc)],s=Fc(this._device);for(const o of i)Oc(o,s);for(const o of i)o.get("Resources Created").incrementCount(),o.get("Resources Active").incrementCount(),o.get(`${e}s Created`).incrementCount(),o.get(`${e}s Active`).incrementCount();t&&(t.statsBookkeepingCalls=(t.statsBookkeepingCalls||0)+1,t.statsBookkeepingTimeMs=(t.statsBookkeepingTimeMs||0)+(je()-r)),Fb(this._device,e)}getStatsName(){return Ub(this)}}f(D,"defaultProps",{id:"undefined",handle:void 0,_isHandleBorrowed:!1,userData:void 0});function Ob(n,e){const t={...e};for(const r in n)n[r]!==void 0&&(t[r]=n[r]);return t}function Oc(n,e){const t=n.stats;let r=!1;for(const c of e)t[c]||(n.get(c),r=!0);const i=Object.keys(t).length,s=Bc.get(n);if(!r&&(s==null?void 0:s.orderedStatNames)===e&&s.statCount===i)return;const o={};let a=Nc.get(e);a||(a=new Set(e),Nc.set(e,a));for(const c of e)t[c]&&(o[c]=t[c]);for(const[c,l]of Object.entries(t))a.has(c)||(o[c]=l);for(const c of Object.keys(t))delete t[c];Object.assign(t,o),Bc.set(n,{orderedStatNames:e,statCount:i})}function Fc(n){return n.type==="webgl"?Nb:Bb}function hn(n){const e=n.userData[Lb];return e!=null&&e.enabled?e:null}function je(){var n,e;return((e=(n=globalThis.performance)==null?void 0:n.now)==null?void 0:e.call(n))??Date.now()}function Fb(n,e){const t=hn(n);if(!(!t||!t.activeDefaultFramebufferAcquireDepth))switch(t.transientCanvasResourceCreates=(t.transientCanvasResourceCreates||0)+1,e){case"Texture":t.transientCanvasTextureCreates=(t.transientCanvasTextureCreates||0)+1;break;case"TextureView":t.transientCanvasTextureViewCreates=(t.transientCanvasTextureViewCreates||0)+1;break;case"Sampler":t.transientCanvasSamplerCreates=(t.transientCanvasSamplerCreates||0)+1;break;case"Framebuffer":t.transientCanvasFramebufferCreates=(t.transientCanvasFramebufferCreates||0)+1;break}}function Ub(n){let e=Object.getPrototypeOf(n);for(;e;){const t=Object.getPrototypeOf(e);if(!t||t===D.prototype)return Db(e)||n[Symbol.toStringTag]||n.constructor.name;e=t}return n[Symbol.toStringTag]||n.constructor.name}function Db(n){const e=Object.getOwnPropertyDescriptor(n,Symbol.toStringTag);return typeof(e==null?void 0:e.get)=="function"?e.get.call(n):typeof(e==null?void 0:e.value)=="string"?e.value:null}const ne=class ne extends D{constructor(t,r){const i={...r};(r.usage||0)&ne.INDEX&&!r.indexType&&(r.data instanceof Uint32Array?i.indexType="uint32":r.data instanceof Uint16Array?i.indexType="uint16":r.data instanceof Uint8Array&&(i.indexType="uint8")),delete i.data;super(t,i,ne.defaultProps);f(this,"usage");f(this,"indexType");f(this,"updateTimestamp");f(this,"debugData",new ArrayBuffer(0));this.usage=i.usage||0,this.indexType=i.indexType,this.updateTimestamp=t.incrementTimestamp()}get[Symbol.toStringTag](){return"Buffer"}clone(t){return this.device.createBuffer({...this.props,...t})}_setDebugData(t,r,i){if(!this.device.props.debug)return;let s=null,o;ArrayBuffer.isView(t)?(s=t,o=t.buffer):o=t;const a=Math.min(t?t.byteLength:i,ne.DEBUG_DATA_MAX_LENGTH);if(o===null)this.debugData=new ArrayBuffer(a);else{const c=Math.min((s==null?void 0:s.byteOffset)||0,o.byteLength),l=Math.max(0,o.byteLength-c),u=Math.min(a,l);this.debugData=new Uint8Array(o,c,u).slice().buffer}}};f(ne,"INDEX",16),f(ne,"VERTEX",32),f(ne,"UNIFORM",64),f(ne,"STORAGE",128),f(ne,"INDIRECT",256),f(ne,"QUERY_RESOLVE",512),f(ne,"MAP_READ",1),f(ne,"MAP_WRITE",2),f(ne,"COPY_SRC",4),f(ne,"COPY_DST",8),f(ne,"DEBUG_DATA_MAX_LENGTH",32),f(ne,"defaultProps",{...D.defaultProps,handle:void 0,usage:0,byteLength:0,byteOffset:0,data:null,indexType:"uint16",onMapped:void 0});let F=ne;const fo=globalThis.Float16Array;function kb(){return fo??Uint16Array}function $b(n){return!!(fo&&n===fo)}function Vb(n){const e=n.includes("norm"),t=!e&&!n.startsWith("float"),r=n.startsWith("s"),i=ha[n],[s,o,a]=i||["uint8 ","i32",1];return{signedType:s,primitiveType:o,byteLength:a,normalized:e,integer:t,signed:r}}function Gb(n){const e=n;switch(e){case"uint8":return"unorm8";case"sint8":return"snorm8";case"uint16":return"unorm16";case"sint16":return"snorm16";default:return e}}function Ue(n,e){switch(e){case 1:return n;case 2:return n+n%2;default:return n+(4-n%4)%4}}function If(n){const e=ArrayBuffer.isView(n)?n.constructor:n;if($b(e))return"float16";if(e===Uint8ClampedArray)return"uint8";const t=Object.values(ha).find(r=>e===r[4]);if(!t)throw new Error(e.name);return t[0]}function zb(n){return If(n)}function _n(n){if(n==="float16")return kb();const e=ha[n];if(!e)throw new Error(n);const[,,,,t]=e;return t}function Mf(n){return _n(n)}const ha={uint8:["uint8","u32",1,!1,Uint8Array],sint8:["sint8","i32",1,!1,Int8Array],unorm8:["uint8","f32",1,!0,Uint8Array],snorm8:["sint8","f32",1,!0,Int8Array],uint16:["uint16","u32",2,!1,Uint16Array],sint16:["sint16","i32",2,!1,Int16Array],unorm16:["uint16","u32",2,!0,Uint16Array],snorm16:["sint16","i32",2,!0,Int16Array],float16:["float16","f16",2,!1,Uint16Array],float32:["float32","f32",4,!1,Float32Array],uint32:["uint32","u32",4,!1,Uint32Array],sint32:["sint32","i32",4,!1,Int32Array]};class Wb{getDataTypeInfo(e){return Vb(e)}getNormalizedDataType(e){return Gb(e)}alignTo(e,t){return Ue(e,t)}getDataType(e){return zb(e)}getTypedArrayConstructor(e){return Mf(e)}}const Ze=new Wb;class Hb{getVertexFormatInfo(e){if(e==="unorm10-10-10-2")return{type:"unorm8",components:4,byteLength:4,integer:!1,signed:!1,normalized:!0};let t=e==="unorm8x4-bgra"?"unorm8x4":e,r;t.endsWith("-webgl")&&(t=t.slice(0,-6),r=!0);const i=t.split("x");if(i.length>2)throw new Error(`Unsupported vertex format: ${e}`);const[s,o]=i,a=s,c=Xb(e,o),l=jb(e,a);let u;try{u=r?Kb(e,a,c):this.makeVertexFormat(l.signedType,c,l.normalized)}catch{throw new Error(`Unsupported vertex format: ${e}`)}if(u!==(r?e:t))throw new Error(`Unsupported vertex format: ${e}`);const d={type:a,components:c,byteLength:l.byteLength*c,integer:l.integer,signed:l.signed,normalized:l.normalized};return r&&(d.webglOnly=!0),d}makeVertexFormat(e,t,r){const i=r?Ze.getNormalizedDataType(e):e;switch(i){case"unorm8":return t===1?"unorm8":t===3?"unorm8x3-webgl":`${i}x${t}`;case"snorm8":return t===1?"snorm8":t===3?"snorm8x3-webgl":`${i}x${t}`;case"uint8":case"sint8":if(t===3)throw new Error(`size: ${t}`);return t===1?i:`${i}x${t}`;case"uint16":return t===1?"uint16":t===3?"uint16x3-webgl":`${i}x${t}`;case"sint16":return t===1?"sint16":t===3?"sint16x3-webgl":`${i}x${t}`;case"unorm16":return t===1?"unorm16":t===3?"unorm16x3-webgl":`${i}x${t}`;case"snorm16":return t===1?"snorm16":t===3?"snorm16x3-webgl":`${i}x${t}`;case"float16":if(t===3)throw new Error(`size: ${t}`);return t===1?i:`${i}x${t}`;default:return t===1?i:`${i}x${t}`}}getVertexFormatFromAttribute(e,t,r){if(!t||t>4)throw new Error(`size ${t}`);const i=t,s=Ze.getDataType(e);return this.makeVertexFormat(s,i,r)}getCompatibleVertexFormat(e){let t;switch(e.primitiveType){case"f32":t="float32";break;case"i32":t="sint32";break;case"u32":t="uint32";break;case"f16":return e.components<=2?"float16x2":"float16x4"}return e.components===1?t:`${t}x${e.components}`}}const ae=new Hb;function jb(n,e){try{return Ze.getDataTypeInfo(e)}catch{throw new Error(`Unsupported vertex format: ${n}`)}}function Xb(n,e){if(!e)return 1;const t=Number(e);if(t===2||t===3||t===4)return t;throw new Error(`Unsupported vertex format: ${n}`)}function Kb(n,e,t){if(t!==3)throw new Error(`Unsupported vertex format: ${n}`);switch(e){case"uint8":case"sint8":case"unorm8":case"snorm8":case"uint16":case"sint16":case"unorm16":case"snorm16":return`${e}x3-webgl`;default:throw new Error(`Unsupported vertex format: ${n}`)}}const se="texture-compression-bc",V="texture-compression-astc",Pe="texture-compression-etc2",qb="texture-compression-etc1-webgl",lr="texture-compression-pvrtc-webgl",as="texture-compression-atc-webgl",ur="float32-renderable-webgl",cs="float16-renderable-webgl",Yb="rgb9e5ufloat-renderable-webgl",ls="snorm8-renderable-webgl",Xe="norm16-webgl",us="norm16-renderable-webgl",fs="snorm16-renderable-webgl",fr="float32-filterable",Uc="float16-filterable-webgl",Qn=1,Zn=2,ma=4,pa=8,Jt=16,Ni=5,Lf=10,Z=Qn|Zn,dr=Qn|ma,ke=Qn|Zn|ma|pa,Be=Qn|Zn|Jt,Qb=Qn|ma|Jt,ho=ke|Jt,Dc=(Zn|pa|Jt)<<Ni,Zb=(Zn|pa)<<Ni,ce=Jt<<Ni,Et=ho<<Ni,Jb=ke<<Lf,ds=Jt<<Lf;function ga(n){const e=Cf[n];if(!e)throw new Error(`Unsupported texture format ${n}`);return e}function e_(){return Cf}const t_={r8unorm:{webgpu:ke|ce},rg8unorm:{webgpu:ke|ce},"rgb8unorm-webgl":{},rgba8unorm:{webgpu:ho},"rgba8unorm-srgb":{webgpu:ke},r8snorm:{render:ls,webgpu:dr|Dc},rg8snorm:{render:ls,webgpu:dr|Dc},"rgb8snorm-webgl":{},rgba8snorm:{render:ls,webgpu:Qb|Zb},r8uint:{webgpu:Z|ce},rg8uint:{webgpu:Z|ce},rgba8uint:{webgpu:Be},r8sint:{webgpu:Z|ce},rg8sint:{webgpu:Z|ce},rgba8sint:{webgpu:Be},bgra8unorm:{webgpu:ke},"bgra8unorm-srgb":{webgpu:Jb},r16unorm:{f:Xe,render:us,webgpu:Et},rg16unorm:{f:Xe,render:us,webgpu:Et},"rgb16unorm-webgl":{f:Xe,render:!1},rgba16unorm:{f:Xe,render:us,webgpu:Et},r16snorm:{f:Xe,render:fs,webgpu:Et},rg16snorm:{f:Xe,render:fs,webgpu:Et},"rgb16snorm-webgl":{f:Xe,render:!1},rgba16snorm:{f:Xe,render:fs,webgpu:Et},r16uint:{webgpu:Z|ce},rg16uint:{webgpu:Z|ce},rgba16uint:{webgpu:Be},r16sint:{webgpu:Z|ce},rg16sint:{webgpu:Z|ce},rgba16sint:{webgpu:Be},r16float:{render:cs,filter:"float16-filterable-webgl",webgpu:ke|ce},rg16float:{render:cs,filter:Uc,webgpu:ke|ce},rgba16float:{render:cs,filter:Uc,webgpu:ho},r32uint:{webgpu:Be},rg32uint:{webgpu:Z|ds},rgba32uint:{webgpu:Be},r32sint:{webgpu:Be},rg32sint:{webgpu:Z|ds},rgba32sint:{webgpu:Be},r32float:{render:ur,filter:fr,webgpu:Be},rg32float:{render:!1,filter:fr,webgpu:Z|ds},"rgb32float-webgl":{render:ur,filter:fr},rgba32float:{render:ur,filter:fr,webgpu:Be},"rgba4unorm-webgl":{channels:"rgba",bitsPerChannel:[4,4,4,4],packed:!0},"rgb565unorm-webgl":{channels:"rgb",bitsPerChannel:[5,6,5,0],packed:!0},"rgb5a1unorm-webgl":{channels:"rgba",bitsPerChannel:[5,5,5,1],packed:!0},rgb9e5ufloat:{channels:"rgb",packed:!0,render:Yb,webgpu:dr},rg11b10ufloat:{channels:"rgb",bitsPerChannel:[11,11,10,0],packed:!0,p:1,render:ur,webgpu:dr|ce},rgb10a2unorm:{channels:"rgba",bitsPerChannel:[10,10,10,2],packed:!0,p:1,webgpu:ke|ce},rgb10a2uint:{channels:"rgba",bitsPerChannel:[10,10,10,2],packed:!0,p:1,webgpu:Z|ce},stencil8:{attachment:"stencil",bitsPerChannel:[8,0,0,0],dataType:"uint8",webgpu:Z},depth16unorm:{attachment:"depth",bitsPerChannel:[16,0,0,0],dataType:"uint16",webgpu:Z},depth24plus:{attachment:"depth",bitsPerChannel:[24,0,0,0],dataType:"uint32",webgpu:Z},depth32float:{attachment:"depth",bitsPerChannel:[32,0,0,0],dataType:"float32",webgpu:Z},"depth24plus-stencil8":{attachment:"depth-stencil",bitsPerChannel:[24,8,0,0],packed:!0,webgpu:Z},"depth32float-stencil8":{attachment:"depth-stencil",bitsPerChannel:[32,8,0,0],packed:!0,f:"depth32float-stencil8",webgpu:Z}},n_={"bc1-rgb-unorm-webgl":{f:se},"bc1-rgb-unorm-srgb-webgl":{f:se},"bc1-rgba-unorm":{f:se},"bc1-rgba-unorm-srgb":{f:se},"bc2-rgba-unorm":{f:se},"bc2-rgba-unorm-srgb":{f:se},"bc3-rgba-unorm":{f:se},"bc3-rgba-unorm-srgb":{f:se},"bc4-r-unorm":{f:se},"bc4-r-snorm":{f:se},"bc5-rg-unorm":{f:se},"bc5-rg-snorm":{f:se},"bc6h-rgb-ufloat":{f:se},"bc6h-rgb-float":{f:se},"bc7-rgba-unorm":{f:se},"bc7-rgba-unorm-srgb":{f:se},"etc2-rgb8unorm":{f:Pe},"etc2-rgb8unorm-srgb":{f:Pe},"etc2-rgb8a1unorm":{f:Pe},"etc2-rgb8a1unorm-srgb":{f:Pe},"etc2-rgba8unorm":{f:Pe},"etc2-rgba8unorm-srgb":{f:Pe},"eac-r11unorm":{f:Pe},"eac-r11snorm":{f:Pe},"eac-rg11unorm":{f:Pe},"eac-rg11snorm":{f:Pe},"astc-4x4-unorm":{f:V},"astc-4x4-unorm-srgb":{f:V},"astc-5x4-unorm":{f:V},"astc-5x4-unorm-srgb":{f:V},"astc-5x5-unorm":{f:V},"astc-5x5-unorm-srgb":{f:V},"astc-6x5-unorm":{f:V},"astc-6x5-unorm-srgb":{f:V},"astc-6x6-unorm":{f:V},"astc-6x6-unorm-srgb":{f:V},"astc-8x5-unorm":{f:V},"astc-8x5-unorm-srgb":{f:V},"astc-8x6-unorm":{f:V},"astc-8x6-unorm-srgb":{f:V},"astc-8x8-unorm":{f:V},"astc-8x8-unorm-srgb":{f:V},"astc-10x5-unorm":{f:V},"astc-10x5-unorm-srgb":{f:V},"astc-10x6-unorm":{f:V},"astc-10x6-unorm-srgb":{f:V},"astc-10x8-unorm":{f:V},"astc-10x8-unorm-srgb":{f:V},"astc-10x10-unorm":{f:V},"astc-10x10-unorm-srgb":{f:V},"astc-12x10-unorm":{f:V},"astc-12x10-unorm-srgb":{f:V},"astc-12x12-unorm":{f:V},"astc-12x12-unorm-srgb":{f:V},"pvrtc-rgb4unorm-webgl":{f:lr},"pvrtc-rgba4unorm-webgl":{f:lr},"pvrtc-rgb2unorm-webgl":{f:lr},"pvrtc-rgba2unorm-webgl":{f:lr},"etc1-rbg-unorm-webgl":{f:qb},"atc-rgb-unorm-webgl":{f:as},"atc-rgba-unorm-webgl":{f:as},"atc-rgbai-unorm-webgl":{f:as}},Cf={...t_,...n_},r_=/^(r|rg|rgb|rgba|bgra)([0-9]*)([a-z]*)(-srgb)?(-webgl)?$/,i_=["rgb","rgba","bgra"],s_=["depth","stencil"],o_=5,a_=["bc1","bc2","bc3","bc4","bc5","bc6","bc7","etc1","etc2","eac","atc","astc","pvrtc"];class c_{isColor(e){return i_.some(t=>e.startsWith(t))}isDepthStencil(e){return s_.some(t=>e.startsWith(t))}isCompressed(e){return a_.some(t=>e.startsWith(t))}getInfo(e){return Pf(e)}getCapabilities(e){return u_(e)}getWebGPUCapabilities(e){const t=ga(e);return t.webgpu!==void 0?t.webgpu:this.isCompressed(e)&&!e.endsWith("-webgl")?o_:0}computeMemoryLayout(e){return l_(e)}}const xe=new c_;function l_({format:n,width:e,height:t,depth:r,byteAlignment:i}){const s=xe.getInfo(n),{bytesPerPixel:o,bytesPerBlock:a=o,blockWidth:c=1,blockHeight:l=1,compressed:u=!1}=s,d=u?Math.ceil(e/c):e,h=u?Math.ceil(t/l):t,m=d*a,p=Math.ceil(m/i)*i,g=h,b=p*g*r;return{bytesPerPixel:o,bytesPerRow:p,rowsPerImage:g,depthOrArrayLayers:r,bytesPerImage:p*g,byteLength:b}}function u_(n){const e=ga(n),t={format:n,create:e.f??!0,render:e.render??!0,filter:e.filter??!0,blend:e.blend??!0,store:e.store??!0},r=Pf(n),i=n.startsWith("depth")||n.startsWith("stencil"),s=r==null?void 0:r.signed,o=r==null?void 0:r.integer,a=r==null?void 0:r.webgl,c=!!(r!=null&&r.compressed);return t.render&&(t.render=!i&&!c),t.filter&&(t.filter=!i&&!s&&!o&&!a),t}function Pf(n){let e=f_(n);if(xe.isCompressed(n)){e.channels="rgb",e.components=3,e.bytesPerPixel=1,e.srgb=!1,e.compressed=!0,e.bytesPerBlock=h_(n);const r=d_(n);r&&(e.blockWidth=r.blockWidth,e.blockHeight=r.blockHeight)}const t=e.packed?null:r_.exec(n);if(t){const[,r,i,s,o,a]=t,c=`${s}${i}`,l=Ze.getDataTypeInfo(c),u=l.byteLength*8,d=(r==null?void 0:r.length)??1,h=[u,d>=2?u:0,d>=3?u:0,d>=4?u:0];e={format:n,attachment:e.attachment,dataType:l.signedType,components:d,channels:r,integer:l.integer,signed:l.signed,normalized:l.normalized,bitsPerChannel:h,bytesPerPixel:l.byteLength*d,packed:e.packed,srgb:e.srgb},a==="-webgl"&&(e.webgl=!0),o==="-srgb"&&(e.srgb=!0)}return n.endsWith("-webgl")&&(e.webgl=!0),n.endsWith("-srgb")&&(e.srgb=!0),e}function f_(n){var s;const e={...ga(n)},t=e.bytesPerPixel||1,r=e.bitsPerChannel||[8,8,8,8];return delete e.bitsPerChannel,delete e.bytesPerPixel,delete e.f,delete e.render,delete e.filter,delete e.blend,delete e.store,delete e.webgpu,{...e,format:n,attachment:e.attachment||"color",channels:e.channels||"r",components:e.components||((s=e.channels)==null?void 0:s.length)||1,bytesPerPixel:t,bitsPerChannel:r,dataType:e.dataType||"uint8",srgb:e.srgb??!1,packed:e.packed??!1,webgl:e.webgl??!1,integer:e.integer??!1,signed:e.signed??!1,normalized:e.normalized??!1,compressed:e.compressed??!1}}function d_(n){const t=/.*-(\d+)x(\d+)-.*/.exec(n);if(t){const[,r,i]=t;return{blockWidth:Number(r),blockHeight:Number(i)}}return n.startsWith("bc")||n.startsWith("etc1")||n.startsWith("etc2")||n.startsWith("eac")||n.startsWith("atc")?{blockWidth:4,blockHeight:4}:n.startsWith("pvrtc-rgb4")||n.startsWith("pvrtc-rgba4")?{blockWidth:4,blockHeight:4}:n.startsWith("pvrtc-rgb2")||n.startsWith("pvrtc-rgba2")?{blockWidth:8,blockHeight:4}:null}function h_(n){return n.startsWith("bc1")||n.startsWith("bc4")||n.startsWith("etc1")||n.startsWith("etc2-rgb8")||n.startsWith("etc2-rgb8a1")||n.startsWith("eac-r11")||n==="atc-rgb-unorm-webgl"?8:n.startsWith("bc2")||n.startsWith("bc3")||n.startsWith("bc5")||n.startsWith("bc6h")||n.startsWith("bc7")||n.startsWith("etc2-rgba8")||n.startsWith("eac-rg11")||n.startsWith("astc")||n==="atc-rgba-unorm-webgl"||n==="atc-rgbai-unorm-webgl"?16:n.startsWith("pvrtc")?8:16}function ba(n){return typeof ImageData<"u"&&n instanceof ImageData||typeof ImageBitmap<"u"&&n instanceof ImageBitmap||typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLVideoElement<"u"&&n instanceof HTMLVideoElement||typeof VideoFrame<"u"&&n instanceof VideoFrame||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<"u"&&n instanceof OffscreenCanvas}function Bf(n){if(typeof ImageData<"u"&&n instanceof ImageData||typeof ImageBitmap<"u"&&n instanceof ImageBitmap||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<"u"&&n instanceof OffscreenCanvas)return{width:n.width,height:n.height};if(typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement)return{width:n.naturalWidth,height:n.naturalHeight};if(typeof HTMLVideoElement<"u"&&n instanceof HTMLVideoElement)return{width:n.videoWidth,height:n.videoHeight};if(typeof VideoFrame<"u"&&n instanceof VideoFrame)return{width:n.displayWidth,height:n.displayHeight};throw new Error("Unknown image type")}class m_{}function p_(n,e){const t=mo(n),r=e.map(mo).filter(i=>i!==void 0);return[t,...r].filter(i=>i!==void 0)}function mo(n){var e;if(n!==void 0){if(n===null||typeof n=="string"||typeof n=="number"||typeof n=="boolean")return n;if(n instanceof Error)return n.message;if(Array.isArray(n))return n.map(mo);if(typeof n=="object"){if(g_(n)){const t=String(n);if(t!=="[object Object]")return t}return b_(n)?__(n):((e=n.constructor)==null?void 0:e.name)||"Object"}return String(n)}}function g_(n){return"toString"in n&&typeof n.toString=="function"&&n.toString!==Object.prototype.toString}function b_(n){return"message"in n&&"type"in n}function __(n){const e=typeof n.type=="string"?n.type:"message",t=typeof n.message=="string"?n.message:"",r=typeof n.lineNum=="number"?n.lineNum:null,i=typeof n.linePos=="number"?n.linePos:null,s=r!==null&&i!==null?` @ ${r}:${i}`:r!==null?` @ ${r}`:"";return`${e}${s}: ${t}`.trim()}class y_{constructor(e=[],t){f(this,"features");f(this,"disabledFeatures");this.features=new Set(e),this.disabledFeatures=t||{}}*[Symbol.iterator](){yield*this.features}has(e){var t;return!((t=this.disabledFeatures)!=null&&t[e])&&this.features.has(e)}}function v_(){if(typeof HTMLCanvasElement>"u")return!1;const n=HTMLCanvasElement.prototype;return"layoutSubtree"in n&&typeof n.requestPaint=="function"}const di=class di{constructor(e){f(this,"id");f(this,"props");f(this,"userData",{});f(this,"statsManager",Rf);f(this,"_factories",{});f(this,"timestamp",0);f(this,"_reused",!1);f(this,"_moduleData",{});f(this,"wgslLanguageFeatures",new Set);f(this,"_textureCaps",{});f(this,"_debugGPUTimeQuery",null);this.props={...di.defaultProps,...e},this.id=this.props.id||Yn(this[Symbol.toStringTag].toLowerCase())}get[Symbol.toStringTag](){return"Device"}toString(){return`Device(${this.id})`}toJSON(){return this.toString()}getVertexFormatInfo(e){return ae.getVertexFormatInfo(e)}isVertexFormatSupported(e){return!0}getTextureFormatInfo(e){return xe.getInfo(e)}getTextureFormatCapabilities(e){let t=this._textureCaps[e];if(!t){const r=this._getDeviceTextureFormatCapabilities(e);t=this._getDeviceSpecificTextureFormatCapabilities(r),this._textureCaps[e]=t}return t}getMipLevelCount(e,t,r=1){const i=Math.max(e,t,r);return 1+Math.floor(Math.log2(i))}isExternalImage(e){return ba(e)}getExternalImageSize(e){return Bf(e)}isTextureFormatSupported(e){return this.getTextureFormatCapabilities(e).create}isTextureFormatFilterable(e){return this.getTextureFormatCapabilities(e).filter}isTextureFormatRenderable(e){return this.getTextureFormatCapabilities(e).render}isTextureFormatCompressed(e){return xe.isCompressed(e)}getSupportedCompressedTextureFormats(){const e=[];for(const t of Object.keys(e_()))this.isTextureFormatCompressed(t)&&this.isTextureFormatSupported(t)&&e.push(t);return e}pushDebugGroup(e){this.commandEncoder.pushDebugGroup(e)}popDebugGroup(){var e;(e=this.commandEncoder)==null||e.popDebugGroup()}insertDebugMarker(e){var t;(t=this.commandEncoder)==null||t.insertDebugMarker(e)}loseDevice(){return!1}incrementTimestamp(){return this.timestamp++}reportError(e,t,...r){if(!this.props.onError(e,t)){const s=p_(t,r);return S.error(this.type==="webgl"?"%cWebGL":"%cWebGPU","color: white; background: red; padding: 2px 6px; border-radius: 3px;",e.message,...s)}return()=>{}}debug(){if(this.props.debug)debugger;else S.once(0,`'Type luma.log.set({debug: true}) in console to enable debug breakpoints',
or create a device with the 'debug: true' prop.`)()}getDefaultCanvasContext(){if(!this.canvasContext)throw new Error("Device has no default CanvasContext. See props.createCanvasContext");return this.canvasContext}createFence(){throw new Error("createFence() not implemented")}beginRenderPass(e){return this.commandEncoder.beginRenderPass(e)}beginComputePass(e){return this.commandEncoder.beginComputePass(e)}writeBufferViaCommandEncoder(e,t,r,i=0){throw new Error("writeBufferViaCommandEncoder() not implemented")}generateMipmapsWebGPU(e){throw new Error("not implemented")}_createSharedRenderPipelineWebGL(e){throw new Error("_createSharedRenderPipelineWebGL() not implemented")}_createBindGroupLayoutWebGPU(e,t){throw new Error("_createBindGroupLayoutWebGPU() not implemented")}_createBindGroupWebGPU(e,t,r,i,s){throw new Error("_createBindGroupWebGPU() not implemented")}_supportsDebugGPUTime(){return this.features.has("timestamp-query")&&!!(this.props.debug||this.props.debugGPUTime)}_enableDebugGPUTime(e=256){if(!this._supportsDebugGPUTime())return null;if(this._debugGPUTimeQuery)return this._debugGPUTimeQuery;try{this._debugGPUTimeQuery=this.createQuerySet({type:"timestamp",count:e}),this.commandEncoder=this.createCommandEncoder({id:this.commandEncoder.props.id,timeProfilingQuerySet:this._debugGPUTimeQuery})}catch{this._debugGPUTimeQuery=null}return this._debugGPUTimeQuery}_disableDebugGPUTime(){this._debugGPUTimeQuery&&(this.commandEncoder.getTimeProfilingQuerySet()===this._debugGPUTimeQuery&&(this.commandEncoder=this.createCommandEncoder({id:this.commandEncoder.props.id})),this._debugGPUTimeQuery.destroy(),this._debugGPUTimeQuery=null)}_isDebugGPUTimeEnabled(){return this._debugGPUTimeQuery!==null}getCanvasContext(){return this.getDefaultCanvasContext()}readPixelsToArrayWebGL(e,t){throw new Error("not implemented")}readPixelsToBufferWebGL(e,t){throw new Error("not implemented")}setParametersWebGL(e){throw new Error("not implemented")}getParametersWebGL(e){throw new Error("not implemented")}withParametersWebGL(e,t){throw new Error("not implemented")}clearWebGL(e){throw new Error("not implemented")}resetWebGL(){throw new Error("not implemented")}getModuleData(e){var t;return(t=this._moduleData)[e]||(t[e]={}),this._moduleData[e]}static _getCanvasContextProps(e){return e.createCanvasContext===!0?{}:e.createCanvasContext}_getDeviceTextureFormatCapabilities(e){const t=xe.getCapabilities(e),r=s=>(typeof s=="string"?this.features.has(s):s)??!0,i=r(t.create);return{format:e,create:i,render:i&&r(t.render),filter:i&&r(t.filter),blend:i&&r(t.blend),store:i&&r(t.store)}}_normalizeBufferProps(e){(e instanceof ArrayBuffer||ArrayBuffer.isView(e))&&(e={data:e});const t={...e};if((e.usage||0)&F.INDEX&&(e.indexType||(e.data instanceof Uint32Array?t.indexType="uint32":e.data instanceof Uint16Array?t.indexType="uint16":e.data instanceof Uint8Array&&(t.data=new Uint16Array(e.data),t.indexType="uint16")),!t.indexType))throw new Error("indices buffer content must be of type uint16 or uint32");return t}};f(di,"defaultProps",{...Af});let Dt=di;class x_{constructor(e){f(this,"props");f(this,"_resizeObserver");f(this,"_intersectionObserver");f(this,"_observeDevicePixelRatioTimeout",null);f(this,"_observeDevicePixelRatioMediaQuery",null);f(this,"_handleDevicePixelRatioChange",()=>this._refreshDevicePixelRatio());f(this,"_trackPositionInterval",null);f(this,"_started",!1);this.props=e}get started(){return this._started}start(){if(this._started||!this.props.canvas)return;this._started=!0,this._intersectionObserver||(this._intersectionObserver=new IntersectionObserver(t=>this.props.onIntersection(t))),this._resizeObserver||(this._resizeObserver=new ResizeObserver(t=>this.props.onResize(t))),this._intersectionObserver.observe(this.props.canvas);const e=this.props.resizeObserverBox;try{this._resizeObserver.observe(this.props.canvas,{box:e})}catch{this._resizeObserver.observe(this.props.canvas,{box:"content-box"})}this._observeDevicePixelRatioTimeout=setTimeout(()=>this._refreshDevicePixelRatio(),0),this.props.trackPosition&&this._trackPosition()}stop(){var e,t;this._started&&(this._started=!1,this._observeDevicePixelRatioTimeout&&(clearTimeout(this._observeDevicePixelRatioTimeout),this._observeDevicePixelRatioTimeout=null),this._observeDevicePixelRatioMediaQuery&&(this._observeDevicePixelRatioMediaQuery.removeEventListener("change",this._handleDevicePixelRatioChange),this._observeDevicePixelRatioMediaQuery=null),this._trackPositionInterval&&(clearInterval(this._trackPositionInterval),this._trackPositionInterval=null),(e=this._resizeObserver)==null||e.disconnect(),(t=this._intersectionObserver)==null||t.disconnect())}_refreshDevicePixelRatio(){var e;this._started&&(this.props.onDevicePixelRatioChange(),(e=this._observeDevicePixelRatioMediaQuery)==null||e.removeEventListener("change",this._handleDevicePixelRatioChange),this._observeDevicePixelRatioMediaQuery=matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`),this._observeDevicePixelRatioMediaQuery.addEventListener("change",this._handleDevicePixelRatioChange,{once:!0}))}_trackPosition(e=100){this._trackPositionInterval||(this._trackPositionInterval=setInterval(()=>{this._started?this.props.onPositionChange():this._trackPositionInterval&&(clearInterval(this._trackPositionInterval),this._trackPositionInterval=null)},e))}}function S_(){let n,e;return{promise:new Promise((r,i)=>{n=r,e=i}),resolve:n,reject:e}}function Fn(n,e){var t;if(!n){const r=new Error(e??"luma.gl assertion failed.");throw(t=Error.captureStackTrace)==null||t.call(Error,r,Fn),r}}function Kr(n,e){return Fn(n,e),n}const Nt=class Nt{constructor(e){f(this,"id");f(this,"props");f(this,"canvas");f(this,"htmlCanvas");f(this,"offscreenCanvas");f(this,"type");f(this,"initialized");f(this,"isInitialized",!1);f(this,"isVisible",!0);f(this,"cssWidth");f(this,"cssHeight");f(this,"devicePixelRatio");f(this,"devicePixelWidth");f(this,"devicePixelHeight");f(this,"drawingBufferWidth");f(this,"drawingBufferHeight");f(this,"_initializedResolvers",S_());f(this,"_canvasObserver");f(this,"_position",[0,0]);f(this,"destroyed",!1);f(this,"_needsDrawingBufferResize",!0);f(this,"_configuredDrawingBufferSize",[0,0]);var t,r;this.props={...Nt.defaultProps,...e},e=this.props,this.initialized=this._initializedResolvers.promise,$u()?e.canvas?typeof e.canvas=="string"?this.canvas=T_(e.canvas):this.canvas=e.canvas:this.canvas=E_(e):this.canvas={width:e.width||1,height:e.height||1},Nt.isHTMLCanvas(this.canvas)?(this.id=e.id||this.canvas.id,this.type="html-canvas",this.htmlCanvas=this.canvas):Nt.isOffscreenCanvas(this.canvas)?(this.id=e.id||"offscreen-canvas",this.type="offscreen-canvas",this.offscreenCanvas=this.canvas):(this.id=e.id||"node-canvas-context",this.type="node"),this.cssWidth=((t=this.htmlCanvas)==null?void 0:t.clientWidth)||this.canvas.width,this.cssHeight=((r=this.htmlCanvas)==null?void 0:r.clientHeight)||this.canvas.height,this.devicePixelWidth=this.canvas.width,this.devicePixelHeight=this.canvas.height,this.drawingBufferWidth=this.canvas.width,this.drawingBufferHeight=this.canvas.height,this._configuredDrawingBufferSize=[this.canvas.width,this.canvas.height],this.devicePixelRatio=globalThis.devicePixelRatio||1,this._position=[0,0],this._canvasObserver=new x_({canvas:this.htmlCanvas,trackPosition:this.props.trackPosition,resizeObserverBox:this.props.pixelSizeSource==="css-dpr"?"content-box":"device-pixel-content-box",onResize:i=>this._handleResize(i),onIntersection:i=>this._handleIntersection(i),onDevicePixelRatioChange:()=>this._observeDevicePixelRatio(),onPositionChange:()=>this.updatePosition()})}static isHTMLCanvas(e){return typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement}static isOffscreenCanvas(e){return typeof OffscreenCanvas<"u"&&e instanceof OffscreenCanvas}toString(){return`${this[Symbol.toStringTag]}(${this.id})`}destroy(){this.destroyed||(this.destroyed=!0,this._stopObservers(),this.device=null)}setProps(e){return"useDevicePixels"in e&&(this.props.useDevicePixels=e.useDevicePixels||!1,this._updateDrawingBufferSize()),this}getCurrentFramebuffer(e){return this._resizeDrawingBufferIfNeeded(),this._getCurrentFramebuffer(e)}getCSSSize(){return[this.cssWidth,this.cssHeight]}getPosition(){return this._position}getDevicePixelSize(){return[this.devicePixelWidth,this.devicePixelHeight]}getDrawingBufferSize(){return[this.drawingBufferWidth,this.drawingBufferHeight]}getMaxDrawingBufferSize(){const e=this.device.limits.maxTextureDimension2D;return[e,e]}setDrawingBufferSize(e,t){e=Math.floor(e),t=Math.floor(t),!(this.drawingBufferWidth===e&&this.drawingBufferHeight===t)&&(this.drawingBufferWidth=e,this.drawingBufferHeight=t,this._needsDrawingBufferResize=!0)}getDevicePixelRatio(){return typeof window<"u"&&window.devicePixelRatio||1}cssToDevicePixels(e,t=!0){const r=this.cssToDeviceRatio(),[i,s]=this.getDrawingBufferSize();return A_(e,r,i,s,t)}getPixelSize(){return this.getDevicePixelSize()}getAspect(){const[e,t]=this.getDrawingBufferSize();return e>0&&t>0?e/t:1}cssToDeviceRatio(){try{const[e]=this.getDrawingBufferSize(),[t]=this.getCSSSize();return t?e/t:1}catch{return 1}}resize(e){this.setDrawingBufferSize(e.width,e.height)}_setAutoCreatedCanvasId(e){var t;((t=this.htmlCanvas)==null?void 0:t.id)==="lumagl-auto-created-canvas"&&(this.htmlCanvas.id=e)}_startObservers(){this.destroyed||this._canvasObserver.start()}_stopObservers(){this._canvasObserver.stop()}_handleIntersection(e){if(this.destroyed)return;const t=e.find(i=>i.target===this.canvas);if(!t)return;const r=t.isIntersecting;this.isVisible!==r&&(this.isVisible=r,this.device.props.onVisibilityChange(this))}_handleResize(e){var s;if(this.destroyed)return;const t=e.find(o=>o.target===this.canvas);if(!t)return;const r=Kr((s=t.contentBoxSize)==null?void 0:s[0]);this.cssWidth=r.inlineSize,this.cssHeight=r.blockSize;const i=this.getDevicePixelSize();this._setDevicePixelSize(this._getDevicePixelSizeFromResizeEntry(t)),this._updateDrawingBufferSize(),this.device.props.onResize(this,{oldPixelSize:i})}_updateDrawingBufferSize(){if(this.props.autoResize)if(typeof this.props.useDevicePixels=="number"){const e=this.props.useDevicePixels;this.setDrawingBufferSize(this.cssWidth*e,this.cssHeight*e)}else this.props.useDevicePixels?this.setDrawingBufferSize(this.devicePixelWidth,this.devicePixelHeight):this.setDrawingBufferSize(this.cssWidth,this.cssHeight);this._initializedResolvers.resolve(),this.isInitialized=!0,this.updatePosition()}_getDevicePixelSizeFromResizeEntry(e){var r,i,s,o,a;const t=Kr((r=e.contentBoxSize)==null?void 0:r[0]);return this.props.pixelSizeSource==="css-dpr"?this._getDevicePixelSizeFromCSSSize(t.inlineSize,t.blockSize):{devicePixelWidth:((s=(i=e.devicePixelContentBoxSize)==null?void 0:i[0])==null?void 0:s.inlineSize)||t.inlineSize*devicePixelRatio,devicePixelHeight:((a=(o=e.devicePixelContentBoxSize)==null?void 0:o[0])==null?void 0:a.blockSize)||t.blockSize*devicePixelRatio}}_getDevicePixelSizeFromCSSSize(e,t){const r=this.getDevicePixelRatio();return{devicePixelWidth:Math.floor(e*r),devicePixelHeight:Math.floor(t*r)}}_setDevicePixelSize({devicePixelWidth:e,devicePixelHeight:t}){const[r,i]=this.getMaxDrawingBufferSize();this.devicePixelWidth=Math.max(1,Math.min(e,r)),this.devicePixelHeight=Math.max(1,Math.min(t,i))}_resizeDrawingBufferIfNeeded(){if(this._needsDrawingBufferResize){this._needsDrawingBufferResize=!1,(this.drawingBufferWidth!==this.canvas.width||this.drawingBufferHeight!==this.canvas.height)&&(this.canvas.width=this.drawingBufferWidth,this.canvas.height=this.drawingBufferHeight);const[t,r]=this._configuredDrawingBufferSize;(this.drawingBufferWidth!==t||this.drawingBufferHeight!==r)&&(this._configureDevice(),this._configuredDrawingBufferSize=[this.drawingBufferWidth,this.drawingBufferHeight])}}_observeDevicePixelRatio(){var t,r;if(this.destroyed||!this._canvasObserver.started)return;const e=this.devicePixelRatio;if(this.devicePixelRatio=window.devicePixelRatio,this.props.pixelSizeSource==="css-dpr"){const i=this.getDevicePixelSize();this._setDevicePixelSize(this._getDevicePixelSizeFromCSSSize(this.cssWidth,this.cssHeight)),this._updateDrawingBufferSize(),this.device.props.onResize(this,{oldPixelSize:i})}this.updatePosition(),(r=(t=this.device.props).onDevicePixelRatioChange)==null||r.call(t,this,{oldRatio:e})}updatePosition(){var t,r,i;if(this.destroyed)return;const e=(t=this.htmlCanvas)==null?void 0:t.getBoundingClientRect();if(e){const s=[e.left,e.top];if(this._position??(this._position=s),s[0]!==this._position[0]||s[1]!==this._position[1]){const a=this._position;this._position=s,(i=(r=this.device.props).onPositionChange)==null||i.call(r,this,{oldPosition:a})}}}};f(Nt,"defaultProps",{id:void 0,canvas:null,width:800,height:600,useDevicePixels:!0,pixelSizeSource:"exact",autoResize:!0,container:null,visible:!0,alphaMode:"opaque",colorSpace:"srgb",colorFormat:void 0,toneMapping:"standard",trackPosition:!1});let kt=Nt;function w_(n){if(typeof n=="string"){const e=document.getElementById(n);if(!e)throw new Error(`${n} is not an HTML element`);return e}return n||document.body}function T_(n){const e=document.getElementById(n);if(!kt.isHTMLCanvas(e))throw new Error("Object is not a canvas element");return e}function E_(n){const{width:e,height:t}=n,r=document.createElement("canvas");r.id=Yn("lumagl-auto-created-canvas"),r.width=e||1,r.height=t||1,r.style.width=Number.isFinite(e)?`${e}px`:"100%",r.style.height=Number.isFinite(t)?`${t}px`:"100%",n!=null&&n.visible||(r.style.visibility="hidden");const i=w_((n==null?void 0:n.container)||null);return i.insertBefore(r,i.firstChild),r}function A_(n,e,t,r,i){const s=n,o=kc(s[0],e,t);let a=$c(s[1],e,r,i),c=kc(s[0]+1,e,t);const l=c===t-1?c:c-1;c=$c(s[1]+1,e,r,i);let u;return i?(c=c===0?c:c+1,u=a,a=c):u=c===r-1?c:c-1,{x:o,y:a,width:Math.max(l-o+1,1),height:Math.max(u-a+1,1)}}function kc(n,e,t){return Math.min(Math.round(n*e),t-1)}function $c(n,e,t,r){return r?Math.max(0,t-1-Math.round(n*e)):Math.min(Math.round(n*e),t-1)}class Nf extends kt{}f(Nf,"defaultProps",kt.defaultProps);class R_ extends kt{}const Mn=class Mn extends D{get[Symbol.toStringTag](){return"Sampler"}constructor(e,t){t=Mn.normalizeProps(e,t),super(e,t,Mn.defaultProps)}static normalizeProps(e,t){return t}};f(Mn,"defaultProps",{...D.defaultProps,type:"color-sampler",addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge",addressModeW:"clamp-to-edge",magFilter:"nearest",minFilter:"nearest",mipmapFilter:"none",lodMinClamp:0,lodMaxClamp:32,compare:"less-equal",maxAnisotropy:1});let $t=Mn;const I_={"1d":"1d","2d":"2d","2d-array":"2d",cube:"2d","cube-array":"2d","3d":"3d"},G=class G extends D{constructor(t,r,i){r=G.normalizeProps(t,r);super(t,r,G.defaultProps);f(this,"dimension");f(this,"baseDimension");f(this,"format");f(this,"width");f(this,"height");f(this,"depth");f(this,"mipLevels");f(this,"samples");f(this,"byteAlignment");f(this,"ready",Promise.resolve(this));f(this,"isReady",!0);f(this,"updateTimestamp");if(this.dimension=this.props.dimension,this.baseDimension=I_[this.dimension],this.format=this.props.format,this.width=this.props.width,this.height=this.props.height,this.depth=this.props.depth,this.mipLevels=this.props.mipLevels,this.samples=this.props.samples||1,this.dimension==="cube"&&(this.depth=6),this.props.width===void 0||this.props.height===void 0)if(t.isExternalImage(r.data)){const s=t.getExternalImageSize(r.data);this.width=(s==null?void 0:s.width)||1,this.height=(s==null?void 0:s.height)||1}else this.width=1,this.height=1,(this.props.width===void 0||this.props.height===void 0)&&S.warn(`${this} created with undefined width or height. This is deprecated. Use DynamicTexture instead.`)();this.byteAlignment=(i==null?void 0:i.byteAlignment)||1,this.updateTimestamp=t.incrementTimestamp()}get[Symbol.toStringTag](){return"Texture"}toString(){return`Texture(${this.id},${this.format},${this.width}x${this.height})`}clone(t){return this.device.createTexture({...this.props,...t})}setSampler(t){this.sampler=t instanceof $t?t:this.device.createSampler(t)}copyImageData(t){const{data:r,depth:i,...s}=t;this.writeData(r,{...s,depthOrArrayLayers:s.depthOrArrayLayers??i})}computeMemoryLayout(t={}){const r=this._normalizeTextureReadOptions(t),{width:i=this.width,height:s=this.height,depthOrArrayLayers:o=this.depth}=r,{format:a,byteAlignment:c}=this;return xe.computeMemoryLayout({format:a,width:i,height:s,depth:o,byteAlignment:c})}readBuffer(t,r){throw new Error("readBuffer not implemented")}readDataAsync(t){throw new Error("readBuffer not implemented")}writeBuffer(t,r){throw new Error("readBuffer not implemented")}writeData(t,r){throw new Error("readBuffer not implemented")}readDataSyncWebGL(t){throw new Error("readDataSyncWebGL not available")}generateMipmapsWebGL(){throw new Error("generateMipmapsWebGL not available")}static normalizeProps(t,r){const i={...r},{width:s,height:o}=i;return typeof s=="number"&&(i.width=Math.max(1,Math.ceil(s))),typeof o=="number"&&(i.height=Math.max(1,Math.ceil(o))),i}_initializeData(t){this.device.isExternalImage(t)?this.copyExternalImage({image:t,width:this.width,height:this.height,depth:this.depth,mipLevel:0,x:0,y:0,z:0,aspect:"all",colorSpace:"srgb",premultipliedAlpha:!1,flipY:!1}):t&&this.copyImageData({data:t,mipLevel:0,x:0,y:0,z:0,aspect:"all"})}_normalizeCopyImageDataOptions(t){const{data:r,depth:i,...s}=t,o=this._normalizeTextureWriteOptions({...s,depthOrArrayLayers:s.depthOrArrayLayers??i});return{data:r,depth:o.depthOrArrayLayers,...o}}_normalizeCopyExternalImageOptions(t){const r=G._omitUndefined(t),i=r.mipLevel??0,s=this._getMipLevelSize(i),o=this.device.getExternalImageSize(t.image),a={...G.defaultCopyExternalImageOptions,...s,...o,...r};return a.width=Math.min(a.width,s.width-a.x),a.height=Math.min(a.height,s.height-a.y),a.depth=Math.min(a.depth,s.depthOrArrayLayers-a.z),a}_normalizeCopyElementImageOptions(t){const r=G._omitUndefined(t),i=r.mipLevel??0,s=this._getMipLevelSize(i),o={...G.defaultCopyElementImageOptions,...s,...r};return o.width=Math.min(o.width,s.width-o.x),o.height=Math.min(o.height,s.height-o.y),o.depth=Math.min(o.depth,s.depthOrArrayLayers-o.z),o}_normalizeTextureReadOptions(t){const r=G._omitUndefined(t),i=r.mipLevel??0,s=this._getMipLevelSize(i),o={...G.defaultTextureReadOptions,...s,...r};return o.width=Math.min(o.width,s.width-o.x),o.height=Math.min(o.height,s.height-o.y),o.depthOrArrayLayers=Math.min(o.depthOrArrayLayers,s.depthOrArrayLayers-o.z),o}_getSupportedColorReadOptions(t){const r=this._normalizeTextureReadOptions(t),i=xe.getInfo(this.format);switch(this._validateColorReadAspect(r),this._validateColorReadFormat(i),this.dimension){case"2d":case"cube":case"cube-array":case"2d-array":case"3d":return r;default:throw new Error(`${this} color readback does not support ${this.dimension} textures`)}}_validateColorReadAspect(t){if(t.aspect!=="all")throw new Error(`${this} color readback only supports aspect 'all'`)}_validateColorReadFormat(t){if(t.compressed)throw new Error(`${this} color readback does not support compressed formats (${this.format})`);switch(t.attachment){case"color":return;case"depth":throw new Error(`${this} color readback does not support depth formats (${this.format})`);case"stencil":throw new Error(`${this} color readback does not support stencil formats (${this.format})`);case"depth-stencil":throw new Error(`${this} color readback does not support depth-stencil formats (${this.format})`);default:throw new Error(`${this} color readback does not support format ${this.format}`)}}_normalizeTextureWriteOptions(t){const r=G._omitUndefined(t),i=r.mipLevel??0,s=this._getMipLevelSize(i),o={...G.defaultTextureWriteOptions,...s,...r};o.width=Math.min(o.width,s.width-o.x),o.height=Math.min(o.height,s.height-o.y),o.depthOrArrayLayers=Math.min(o.depthOrArrayLayers,s.depthOrArrayLayers-o.z);const a=xe.computeMemoryLayout({format:this.format,width:o.width,height:o.height,depth:o.depthOrArrayLayers,byteAlignment:this.byteAlignment}),c=a.bytesPerPixel*o.width;if(o.bytesPerRow=r.bytesPerRow??a.bytesPerRow,o.rowsPerImage=r.rowsPerImage??o.height,o.bytesPerRow<c)throw new Error(`bytesPerRow (${o.bytesPerRow}) must be at least ${c} for ${this.format}`);if(o.rowsPerImage<o.height)throw new Error(`rowsPerImage (${o.rowsPerImage}) must be at least ${o.height} for ${this.format}`);const l=this.device.getTextureFormatInfo(this.format).bytesPerPixel;if(l&&o.bytesPerRow%l!==0)throw new Error(`bytesPerRow (${o.bytesPerRow}) must be a multiple of bytesPerPixel (${l}) for ${this.format}`);return o}_getMipLevelSize(t){const r=Math.max(1,this.width>>t),i=this.baseDimension==="1d"?1:Math.max(1,this.height>>t),s=this.dimension==="3d"?Math.max(1,this.depth>>t):this.depth;return{width:r,height:i,depthOrArrayLayers:s}}getAllocatedByteLength(){let t=0;for(let r=0;r<this.mipLevels;r++){const{width:i,height:s,depthOrArrayLayers:o}=this._getMipLevelSize(r);t+=xe.computeMemoryLayout({format:this.format,width:i,height:s,depth:o,byteAlignment:1}).byteLength}return t*this.samples}static _omitUndefined(t){return Object.fromEntries(Object.entries(t).filter(([,r])=>r!==void 0))}};f(G,"SAMPLE",4),f(G,"STORAGE",8),f(G,"RENDER",16),f(G,"COPY_SRC",1),f(G,"COPY_DST",2),f(G,"TEXTURE",4),f(G,"RENDER_ATTACHMENT",16),f(G,"defaultProps",{...D.defaultProps,data:null,dimension:"2d",format:"rgba8unorm",usage:G.SAMPLE|G.RENDER|G.COPY_DST,width:void 0,height:void 0,depth:1,mipLevels:1,samples:void 0,sampler:{},view:void 0}),f(G,"defaultCopyDataOptions",{data:void 0,byteOffset:0,bytesPerRow:void 0,rowsPerImage:void 0,width:void 0,height:void 0,depthOrArrayLayers:void 0,depth:1,mipLevel:0,x:0,y:0,z:0,aspect:"all"}),f(G,"defaultCopyExternalImageOptions",{image:void 0,sourceX:0,sourceY:0,width:void 0,height:void 0,depth:1,mipLevel:0,x:0,y:0,z:0,aspect:"all",colorSpace:"srgb",premultipliedAlpha:!1,flipY:!1}),f(G,"defaultCopyElementImageOptions",{element:void 0,width:void 0,height:void 0,sourceX:0,sourceY:0,sourceWidth:void 0,sourceHeight:void 0,depth:1,mipLevel:0,x:0,y:0,z:0,aspect:"all",colorSpace:"srgb",premultipliedAlpha:!1,flipY:!1}),f(G,"defaultTextureReadOptions",{x:0,y:0,z:0,width:void 0,height:void 0,depthOrArrayLayers:1,mipLevel:0,aspect:"all"}),f(G,"defaultTextureWriteOptions",{byteOffset:0,bytesPerRow:void 0,rowsPerImage:void 0,x:0,y:0,z:0,width:void 0,height:void 0,depthOrArrayLayers:1,mipLevel:0,aspect:"all"});let N=G;const hi=class hi extends D{get[Symbol.toStringTag](){return"TextureView"}constructor(e,t){super(e,t,hi.defaultProps)}};f(hi,"defaultProps",{...D.defaultProps,format:void 0,dimension:void 0,aspect:"all",baseMipLevel:0,mipLevelCount:void 0,baseArrayLayer:0,arrayLayerCount:void 0});let Vt=hi;const mi=class mi extends D{constructor(t,r){super(t,r,mi.defaultProps);f(this,"width");f(this,"height");f(this,"updateTimestamp");const i=this.props.source?t.getExternalImageSize(this.props.source):null;this.width=this.props.width||(i==null?void 0:i.width)||0,this.height=this.props.height||(i==null?void 0:i.height)||0,this.updateTimestamp=t.incrementTimestamp()}get[Symbol.toStringTag](){return"ExternalTexture"}};f(mi,"defaultProps",{...D.defaultProps,source:void 0,width:0,height:0,colorSpace:"srgb",sampler:{}});let qr=mi;function M_(n,e,t){let r="";const i=e.split(/\r?\n/),s=n.slice().sort((o,a)=>o.lineNum-a.lineNum);switch((t==null?void 0:t.showSourceCode)||"no"){case"all":let o=0;for(let a=1;a<=i.length;a++){const c=i[a-1],l=s[o];for(c&&l&&(r+=Of(c,a,t));s.length>o&&l.lineNum===a;){const u=s[o++];u&&(r+=hs(u,i,u.lineNum,{...t,inlineSource:!1}))}}for(;s.length>o;){const a=s[o++];a&&(r+=hs(a,[],0,{...t,inlineSource:!1}))}return r;case"issues":case"no":for(const a of n)r+=hs(a,i,a.lineNum,{inlineSource:(t==null?void 0:t.showSourceCode)!=="no"});return r}}function hs(n,e,t,r){if(r!=null&&r.inlineSource){const s=L_(e,t),o=n.linePos>0?`${" ".repeat(n.linePos+5)}^^^
`:"";return`
${s}${o}${n.type.toUpperCase()}: ${n.message}

`}const i=n.type==="error"?"red":"orange";return r!=null&&r.html?`<div class='luma-compiler-log-${n.type}' style="color:${i};"><b> ${n.type.toUpperCase()}: ${n.message}</b></div>`:`${n.type.toUpperCase()}: ${n.message}`}function L_(n,e,t){let r="";for(let i=e-2;i<=e;i++){const s=n[i-1];s!==void 0&&(r+=Of(s,e,t))}return r}function Of(n,e,t){const r=t!=null&&t.html?P_(n):n;return`${C_(String(e),4)}: ${r}${t!=null&&t.html?"<br/>":`
`}`}function C_(n,e){let t="";for(let r=n.length;r<e;++r)t+=" ";return t+n}function P_(n){return n.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}const pi=class pi extends D{constructor(t,r){r={...r,debugShaders:r.debugShaders||t.props.debugShaders||"errors"};super(t,{id:B_(r),...r},pi.defaultProps);f(this,"stage");f(this,"source");f(this,"compilationStatus","pending");this.stage=this.props.stage,this.source=this.props.source}get[Symbol.toStringTag](){return"Shader"}getCompilationInfoSync(){return null}getTranslatedSource(){return null}async debugShader(){const t=this.props.debugShaders;switch(t){case"never":return;case"errors":if(this.compilationStatus==="success")return;break}try{const r=await this.getCompilationInfo();if(t==="warnings"&&(r==null?void 0:r.length)===0)return;this._displayShaderLog(r,this.id)}catch(r){S.warn(`Shader ${this.id}: failed to fetch compilation info during debug logging`,r)()}}_displayShaderLog(t,r){if(typeof document>"u"||!(document!=null&&document.createElement))return;const i=r,s=`${this.stage} shader "${i}"`,o=M_(t,this.source,{showSourceCode:"all",html:!0}),a=this.getTranslatedSource(),c=document.createElement("div");c.innerHTML=`<h1>Compilation error in ${s}</h1>
<div style="display:flex;position:fixed;top:10px;right:20px;gap:2px;">
<button id="copy">Copy source</button><br/>
<button id="close">Close</button>
</div>
<code><pre>${o}</pre></code>`,a&&(c.innerHTML+=`<br /><h1>Translated Source</h1><br /><br /><code><pre>${a}</pre></code>`),c.style.top="0",c.style.left="0",c.style.background="white",c.style.position="fixed",c.style.zIndex="9999",c.style.maxWidth="100vw",c.style.maxHeight="100vh",c.style.overflowY="auto",document.body.appendChild(c);const l=c.querySelector(".luma-compiler-log-error");l==null||l.scrollIntoView(),c.querySelector("button#close").onclick=()=>{c.remove()},c.querySelector("button#copy").onclick=()=>{navigator.clipboard.writeText(this.source)}}};f(pi,"defaultProps",{...D.defaultProps,language:"auto",stage:void 0,source:"",sourceMap:null,entryPoint:"main",debugShaders:void 0});let Yr=pi;function B_(n){return N_(n.source)||n.id||Yn(`unnamed ${n.stage}-shader`)}function N_(n,e="unnamed"){const r=/#define[\s*]SHADER_NAME[\s*]([A-Za-z0-9_-]+)[\s*]/.exec(n);return(r==null?void 0:r[1])??e}const gi=class gi extends D{constructor(t,r={}){super(t,r,gi.defaultProps);f(this,"width");f(this,"height");this.width=this.props.width,this.height=this.props.height}get[Symbol.toStringTag](){return"Framebuffer"}clone(t){const r=this.colorAttachments.map(s=>s.texture.clone(t)),i=this.depthStencilAttachment&&this.depthStencilAttachment.texture.clone(t);return this.device.createFramebuffer({...this.props,...t,colorAttachments:r,depthStencilAttachment:i})}resize(t){let r=!t;if(t){const[i,s]=Array.isArray(t)?t:[t.width,t.height];r=r||s!==this.height||i!==this.width,this.width=i,this.height=s}r&&(S.log(2,`Resizing framebuffer ${this.id} to ${this.width}x${this.height}`)(),this.resizeAttachments(this.width,this.height))}autoCreateAttachmentTextures(){if(this.props.colorAttachments.length===0&&!this.props.depthStencilAttachment)throw new Error("Framebuffer has noattachments");this.colorAttachments=this.props.colorAttachments.map((r,i)=>{if(typeof r=="string"){const s=this.createColorTexture(r,i);return this.attachResource(s),s.view}return r instanceof N?r.view:r});const t=this.props.depthStencilAttachment;if(t)if(typeof t=="string"){const r=this.createDepthStencilTexture(t);this.attachResource(r),this.depthStencilAttachment=r.view}else t instanceof N?this.depthStencilAttachment=t.view:this.depthStencilAttachment=t}createColorTexture(t,r){return this.device.createTexture({id:`${this.id}-color-attachment-${r}`,usage:N.RENDER_ATTACHMENT,format:t,width:this.width,height:this.height,sampler:{magFilter:"linear",minFilter:"linear"}})}createDepthStencilTexture(t){return this.device.createTexture({id:`${this.id}-depth-stencil-attachment`,usage:N.RENDER_ATTACHMENT|N.SAMPLE,format:t,width:this.width,height:this.height})}resizeAttachments(t,r){if(this.colorAttachments.forEach((i,s)=>{const o=i.texture.clone({width:t,height:r});this.destroyAttachedResource(i),this.colorAttachments[s]=o.view,this.attachResource(o.view)}),this.depthStencilAttachment){const i=this.depthStencilAttachment.texture.clone({width:t,height:r});this.destroyAttachedResource(this.depthStencilAttachment),this.depthStencilAttachment=i.view,this.attachResource(i)}this.updateAttachments()}};f(gi,"defaultProps",{...D.defaultProps,width:1,height:1,colorAttachments:[],depthStencilAttachment:null});let Qr=gi;const bi=class bi extends D{constructor(t,r){super(t,r,bi.defaultProps);f(this,"shaderLayout");f(this,"bufferLayout");f(this,"linkStatus","pending");f(this,"hash","");f(this,"sharedRenderPipeline",null);this.shaderLayout=this.props.shaderLayout,this.bufferLayout=this.props.bufferLayout||[],this.sharedRenderPipeline=this.props._sharedRenderPipeline||null}get[Symbol.toStringTag](){return"RenderPipeline"}get isPending(){var t;return this.linkStatus==="pending"||this.vs.compilationStatus==="pending"||((t=this.fs)==null?void 0:t.compilationStatus)==="pending"}get isErrored(){var t;return this.linkStatus==="error"||this.vs.compilationStatus==="error"||((t=this.fs)==null?void 0:t.compilationStatus)==="error"}};f(bi,"defaultProps",{...D.defaultProps,vs:null,vertexEntryPoint:"vertexMain",vsConstants:{},fs:null,fragmentEntryPoint:"fragmentMain",fsConstants:{},shaderLayout:null,bufferLayout:[],topology:"triangle-list",colorAttachmentFormats:void 0,depthStencilAttachmentFormat:void 0,parameters:{},varyings:void 0,bufferMode:void 0,disableWarnings:!1,_sharedRenderPipeline:void 0,_uniformBlockLayouts:[],bindings:void 0,bindGroups:void 0});let Ye=bi;class O_ extends D{get[Symbol.toStringTag](){return"SharedRenderPipeline"}constructor(e,t){super(e,t,{...D.defaultProps,handle:void 0,vs:void 0,fs:void 0,varyings:void 0,bufferMode:void 0})}}const _i=class _i extends D{constructor(t,r){super(t,r,_i.defaultProps);f(this,"hash","");f(this,"shaderLayout");this.shaderLayout=r.shaderLayout}get[Symbol.toStringTag](){return"ComputePipeline"}};f(_i,"defaultProps",{...D.defaultProps,shader:void 0,entryPoint:void 0,constants:{},shaderLayout:void 0});let Un=_i;const yi=class yi{constructor(e){f(this,"device");f(this,"_hashCounter",0);f(this,"_hashes",{});f(this,"_renderPipelineCache",{});f(this,"_computePipelineCache",{});f(this,"_sharedRenderPipelineCache",{});this.device=e}static getDefaultPipelineFactory(e){const t=e.getModuleData("@luma.gl/core");return t.defaultPipelineFactory||(t.defaultPipelineFactory=new yi(e)),t.defaultPipelineFactory}get[Symbol.toStringTag](){return"PipelineFactory"}toString(){return`PipelineFactory(${this.device.id})`}createRenderPipeline(e){var o;if(!this.device.props._cachePipelines)return this.device.createRenderPipeline(e);const t={...Ye.defaultProps,...e},r=this._renderPipelineCache,i=this._hashRenderPipeline(t);let s=(o=r[i])==null?void 0:o.resource;if(s)r[i].useCount++,this.device.props.debugFactories&&S.log(3,`${this}: ${r[i].resource} reused, count=${r[i].useCount}, (id=${e.id})`)();else{const a=this.device.type==="webgl"&&this.device.props._sharePipelines?this.createSharedRenderPipeline(t):void 0;s=this.device.createRenderPipeline({...t,id:t.id?`${t.id}-cached`:Yn("unnamed-cached"),_sharedRenderPipeline:a}),s.hash=i,r[i]={resource:s,useCount:1},this.device.props.debugFactories&&S.log(3,`${this}: ${s} created, count=${r[i].useCount}`)()}return s}createComputePipeline(e){var o;if(!this.device.props._cachePipelines)return this.device.createComputePipeline(e);const t={...Un.defaultProps,...e},r=this._computePipelineCache,i=this._hashComputePipeline(t);let s=(o=r[i])==null?void 0:o.resource;return s?(r[i].useCount++,this.device.props.debugFactories&&S.log(3,`${this}: ${r[i].resource} reused, count=${r[i].useCount}, (id=${e.id})`)()):(s=this.device.createComputePipeline({...t,id:t.id?`${t.id}-cached`:void 0}),s.hash=i,r[i]={resource:s,useCount:1},this.device.props.debugFactories&&S.log(3,`${this}: ${s} created, count=${r[i].useCount}`)()),s}release(e){if(!this.device.props._cachePipelines){e.destroy();return}const t=this._getCache(e),r=e.hash;t[r].useCount--,t[r].useCount===0?(this._destroyPipeline(e),this.device.props.debugFactories&&S.log(3,`${this}: ${e} released and destroyed`)()):t[r].useCount<0?(S.error(`${this}: ${e} released, useCount < 0, resetting`)(),t[r].useCount=0):this.device.props.debugFactories&&S.log(3,`${this}: ${e} released, count=${t[r].useCount}`)()}createSharedRenderPipeline(e){const t=this._hashSharedRenderPipeline(e);let r=this._sharedRenderPipelineCache[t];return r||(r={resource:this.device._createSharedRenderPipelineWebGL(e),useCount:0},this._sharedRenderPipelineCache[t]=r),r.useCount++,r.resource}releaseSharedRenderPipeline(e){if(!e.sharedRenderPipeline)return;const t=this._hashSharedRenderPipeline(e.sharedRenderPipeline.props),r=this._sharedRenderPipelineCache[t];r&&(r.useCount--,r.useCount===0&&(r.resource.destroy(),delete this._sharedRenderPipelineCache[t]))}_destroyPipeline(e){const t=this._getCache(e);return this.device.props._destroyPipelines?(delete t[e.hash],e.destroy(),e instanceof Ye&&this.releaseSharedRenderPipeline(e),!0):!1}_getCache(e){let t;if(e instanceof Un&&(t=this._computePipelineCache),e instanceof Ye&&(t=this._renderPipelineCache),!t)throw new Error(`${this}`);if(!t[e.hash])throw new Error(`${this}: ${e} matched incorrect entry`);return t}_hashComputePipeline(e){const{type:t}=this.device,r=this._getHash(e.shader.source),i=this._getHash(JSON.stringify(e.shaderLayout));return`${t}/C/${r}SL${i}`}_hashRenderPipeline(e){const t=e.vs?this._getHash(e.vs.source):0,r=e.fs?this._getHash(e.fs.source):0,i=this._getWebGLVaryingHash(e),s=this._getHash(JSON.stringify(e.shaderLayout)),o=this._getHash(JSON.stringify(e._uniformBlockLayouts)),a=this._getHash(JSON.stringify(e.bufferLayout)),{type:c}=this.device;switch(c){case"webgl":const l=this._getHash(JSON.stringify(e.parameters));return`${c}/R/${t}/${r}V${i}T${e.topology}P${l}SL${s}UBL${o}BL${a}`;case"webgpu":default:const u=this._getHash(JSON.stringify({vertexEntryPoint:e.vertexEntryPoint,fragmentEntryPoint:e.fragmentEntryPoint})),d=this._getHash(JSON.stringify(e.parameters)),h=this._getWebGPUAttachmentHash(e);return`${c}/R/${t}/${r}V${i}T${e.topology}EP${u}P${d}SL${s}BL${a}A${h}`}}_hashSharedRenderPipeline(e){const t=e.vs?this._getHash(e.vs.source):0,r=e.fs?this._getHash(e.fs.source):0,i=this._getWebGLVaryingHash(e);return`webgl/S/${t}/${r}V${i}`}_getHash(e){return this._hashes[e]===void 0&&(this._hashes[e]=this._hashCounter++),this._hashes[e]}_getWebGLVaryingHash(e){const{varyings:t=[],bufferMode:r=null}=e;return this._getHash(JSON.stringify({varyings:t,bufferMode:r}))}_getWebGPUAttachmentHash(e){var i;const t=e.colorAttachmentFormats??[this.device.preferredColorFormat],r=e.depthStencilAttachmentFormat??((i=e.parameters)!=null&&i.depthWriteEnabled?this.device.preferredDepthFormat:null);return this._getHash(JSON.stringify({colorAttachmentFormats:t,depthStencilAttachmentFormat:r}))}};f(yi,"defaultProps",{...Ye.defaultProps});let Zr=yi;const vi=class vi{constructor(e){f(this,"device");f(this,"_cache",{});this.device=e}static getDefaultShaderFactory(e){const t=e.getModuleData("@luma.gl/core");return t.defaultShaderFactory||(t.defaultShaderFactory=new vi(e)),t.defaultShaderFactory}get[Symbol.toStringTag](){return"ShaderFactory"}toString(){return`${this[Symbol.toStringTag]}(${this.device.id})`}createShader(e){if(!this.device.props._cacheShaders)return this.device.createShader(e);const t=this._hashShader(e);let r=this._cache[t];if(r)r.useCount++,this.device.props.debugFactories&&S.log(3,`${this}: Reusing shader ${r.resource.id} count=${r.useCount}`)();else{const i=this.device.createShader({...e,id:e.id?`${e.id}-cached`:void 0});this._cache[t]=r={resource:i,useCount:1},this.device.props.debugFactories&&S.log(3,`${this}: Created new shader ${i.id}`)()}return r.resource}release(e){if(!this.device.props._cacheShaders){e.destroy();return}const t=this._hashShader(e),r=this._cache[t];if(r)if(r.useCount--,r.useCount===0)this.device.props._destroyShaders&&(delete this._cache[t],r.resource.destroy(),this.device.props.debugFactories&&S.log(3,`${this}: Releasing shader ${e.id}, destroyed`)());else{if(r.useCount<0)throw new Error(`ShaderFactory: Shader ${e.id} released too many times`);this.device.props.debugFactories&&S.log(3,`${this}: Releasing shader ${e.id} count=${r.useCount}`)()}}_hashShader(e){return`${e.stage}:${e.source}`}};f(vi,"defaultProps",{...Yr.defaultProps});let Jr=vi;function Ff(n,e,t){const r=n.bindings.find(i=>i.name===e||`${i.name.toLocaleLowerCase()}uniforms`===e.toLocaleLowerCase());return!r&&!(t!=null&&t.ignoreWarnings)&&S.warn(`Binding ${e} not set: Not found in shader layout.`)(),r||null}function _a(n,e){if(!e)return{};if(F_(e))return Object.fromEntries(Object.entries(e).map(([i,s])=>[Number(i),{...s}]));const t={};for(const[r,i]of Object.entries(e)){const s=Ff(n,r),o=(s==null?void 0:s.group)??0;t[o]||(t[o]={}),t[o][r]=i}return t}function po(n){const e={};for(const t of Object.values(n))Object.assign(e,t);return e}function F_(n){const e=Object.keys(n);return e.length>0&&e.every(t=>/^\d+$/.test(t))}const we=class we extends D{get[Symbol.toStringTag](){return"RenderPass"}constructor(e,t,r=we.defaultProps){t=we.normalizeProps(e,t),super(e,t,r)}static normalizeProps(e,t){return t}};f(we,"defaultClearColor",[0,0,0,1]),f(we,"defaultClearDepth",1),f(we,"defaultClearStencil",0),f(we,"defaultProps",{...D.defaultProps,framebuffer:null,resolveTargets:void 0,parameters:void 0,clearColor:we.defaultClearColor,clearColors:void 0,clearDepth:we.defaultClearDepth,clearStencil:we.defaultClearStencil,depthReadOnly:!1,stencilReadOnly:!1,discard:!1,occlusionQuerySet:void 0,timestampQuerySet:void 0,beginTimestampIndex:void 0,endTimestampIndex:void 0});let go=we;const xi=class xi extends D{constructor(t,r){super(t,r,xi.defaultProps);f(this,"_timeProfilingQuerySet",null);f(this,"_timeProfilingSlotCount",0);f(this,"_gpuTimeMs");this._timeProfilingQuerySet=r.timeProfilingQuerySet??null,this._timeProfilingSlotCount=0,this._gpuTimeMs=void 0}get[Symbol.toStringTag](){return"CommandEncoder"}async resolveTimeProfilingQuerySet(){if(this._gpuTimeMs=void 0,!this._timeProfilingQuerySet)return;const t=Math.floor(this._timeProfilingSlotCount/2);if(t<=0)return;const r=t*2,i=await this._timeProfilingQuerySet.readResults({firstQuery:0,queryCount:r});let s=0n;for(let o=0;o<r;o+=2)s+=i[o+1]-i[o];this._gpuTimeMs=Number(s)/1e6}getTimeProfilingSlotCount(){return this._timeProfilingSlotCount}getTimeProfilingQuerySet(){return this._timeProfilingQuerySet}_applyTimeProfilingToPassProps(t){const r=t||{};if(!this._supportsTimestampQueries()||!this._timeProfilingQuerySet||r.timestampQuerySet!==void 0||r.beginTimestampIndex!==void 0||r.endTimestampIndex!==void 0)return r;const i=this._timeProfilingSlotCount;return i+1>=this._timeProfilingQuerySet.props.count?r:(this._timeProfilingSlotCount+=2,{...r,timestampQuerySet:this._timeProfilingQuerySet,beginTimestampIndex:i,endTimestampIndex:i+1})}_supportsTimestampQueries(){return this.device.features.has("timestamp-query")}};f(xi,"defaultProps",{...D.defaultProps,measureExecutionTime:void 0,timeProfilingQuerySet:void 0});let bo=xi;const Si=class Si extends D{get[Symbol.toStringTag](){return"CommandBuffer"}constructor(e,t){super(e,t,Si.defaultProps)}};f(Si,"defaultProps",{...D.defaultProps});let _o=Si;const wi=class wi extends D{constructor(t,r){super(t,r,wi.defaultProps);f(this,"maxVertexAttributes");f(this,"indexBuffer",null);f(this,"attributes");this.maxVertexAttributes=t.limits.maxVertexAttributes,this.attributes=new Array(this.maxVertexAttributes).fill(null)}get[Symbol.toStringTag](){return"VertexArray"}getBufferSlot(t){return null}getDrawValidationError(){return null}setConstantWebGL(t,r){this.device.reportError(new Error("constant attributes not supported"),this)()}};f(wi,"defaultProps",{...D.defaultProps,shaderLayout:void 0,bufferLayout:[]});let yo=wi;const Ti=class Ti extends D{get[Symbol.toStringTag](){return"TransformFeedback"}constructor(e,t){super(e,t,Ti.defaultProps)}};f(Ti,"defaultProps",{...D.defaultProps,layout:void 0,buffers:{}});let vo=Ti;const Ei=class Ei extends D{get[Symbol.toStringTag](){return"QuerySet"}constructor(e,t){super(e,t,Ei.defaultProps)}};f(Ei,"defaultProps",{...D.defaultProps,type:void 0,count:void 0});let xo=Ei;const Ai=class Ai extends D{get[Symbol.toStringTag](){return"Fence"}constructor(e,t={}){super(e,t,Ai.defaultProps)}};f(Ai,"defaultProps",{...D.defaultProps});let So=Ai;function ya(n){const e=va(n),t=G_[e];if(!t)throw new Error(`Unsupported variable shader type: ${n}`);return t}function U_(n){const e=Uf(n),t=V_[e];if(!t)throw new Error(`Unsupported attribute shader type: ${n}`);const[r,i]=t,s=r==="i32"||r==="u32",o=r!=="u32",a=$_[r]*i;return{primitiveType:r,components:i,byteLength:a,integer:s,signed:o}}class D_{getVariableShaderTypeInfo(e){return ya(e)}getAttributeShaderTypeInfo(e){return U_(e)}makeShaderAttributeType(e,t){return k_(e,t)}resolveAttributeShaderTypeAlias(e){return Uf(e)}resolveVariableShaderTypeAlias(e){return va(e)}}function k_(n,e){return e===1?n:`vec${e}<${n}>`}function Uf(n){return z_[n]||n}function va(n){return W_[n]||n}const en=new D_,$_={f32:4,f16:2,i32:4,u32:4},V_={f32:["f32",1],"vec2<f32>":["f32",2],"vec3<f32>":["f32",3],"vec4<f32>":["f32",4],f16:["f16",1],"vec2<f16>":["f16",2],"vec3<f16>":["f16",3],"vec4<f16>":["f16",4],i32:["i32",1],"vec2<i32>":["i32",2],"vec3<i32>":["i32",3],"vec4<i32>":["i32",4],u32:["u32",1],"vec2<u32>":["u32",2],"vec3<u32>":["u32",3],"vec4<u32>":["u32",4]},G_={f32:{type:"f32",components:1},f16:{type:"f16",components:1},i32:{type:"i32",components:1},u32:{type:"u32",components:1},"vec2<f32>":{type:"f32",components:2},"vec3<f32>":{type:"f32",components:3},"vec4<f32>":{type:"f32",components:4},"vec2<f16>":{type:"f16",components:2},"vec3<f16>":{type:"f16",components:3},"vec4<f16>":{type:"f16",components:4},"vec2<i32>":{type:"i32",components:2},"vec3<i32>":{type:"i32",components:3},"vec4<i32>":{type:"i32",components:4},"vec2<u32>":{type:"u32",components:2},"vec3<u32>":{type:"u32",components:3},"vec4<u32>":{type:"u32",components:4},"mat2x2<f32>":{type:"f32",components:4},"mat2x3<f32>":{type:"f32",components:6},"mat2x4<f32>":{type:"f32",components:8},"mat3x2<f32>":{type:"f32",components:6},"mat3x3<f32>":{type:"f32",components:9},"mat3x4<f32>":{type:"f32",components:12},"mat4x2<f32>":{type:"f32",components:8},"mat4x3<f32>":{type:"f32",components:12},"mat4x4<f32>":{type:"f32",components:16},"mat2x2<f16>":{type:"f16",components:4},"mat2x3<f16>":{type:"f16",components:6},"mat2x4<f16>":{type:"f16",components:8},"mat3x2<f16>":{type:"f16",components:6},"mat3x3<f16>":{type:"f16",components:9},"mat3x4<f16>":{type:"f16",components:12},"mat4x2<f16>":{type:"f16",components:8},"mat4x3<f16>":{type:"f16",components:12},"mat4x4<f16>":{type:"f16",components:16},"mat2x2<i32>":{type:"i32",components:4},"mat2x3<i32>":{type:"i32",components:6},"mat2x4<i32>":{type:"i32",components:8},"mat3x2<i32>":{type:"i32",components:6},"mat3x3<i32>":{type:"i32",components:9},"mat3x4<i32>":{type:"i32",components:12},"mat4x2<i32>":{type:"i32",components:8},"mat4x3<i32>":{type:"i32",components:12},"mat4x4<i32>":{type:"i32",components:16},"mat2x2<u32>":{type:"u32",components:4},"mat2x3<u32>":{type:"u32",components:6},"mat2x4<u32>":{type:"u32",components:8},"mat3x2<u32>":{type:"u32",components:6},"mat3x3<u32>":{type:"u32",components:9},"mat3x4<u32>":{type:"u32",components:12},"mat4x2<u32>":{type:"u32",components:8},"mat4x3<u32>":{type:"u32",components:12},"mat4x4<u32>":{type:"u32",components:16}},z_={vec2i:"vec2<i32>",vec3i:"vec3<i32>",vec4i:"vec4<i32>",vec2u:"vec2<u32>",vec3u:"vec3<u32>",vec4u:"vec4<u32>",vec2f:"vec2<f32>",vec3f:"vec3<f32>",vec4f:"vec4<f32>",vec2h:"vec2<f16>",vec3h:"vec3<f16>",vec4h:"vec4<f16>"},W_={vec2i:"vec2<i32>",vec3i:"vec3<i32>",vec4i:"vec4<i32>",vec2u:"vec2<u32>",vec3u:"vec3<u32>",vec4u:"vec4<u32>",vec2f:"vec2<f32>",vec3f:"vec3<f32>",vec4f:"vec4<f32>",vec2h:"vec2<f16>",vec3h:"vec3<f16>",vec4h:"vec4<f16>",mat2x2f:"mat2x2<f32>",mat2x3f:"mat2x3<f32>",mat2x4f:"mat2x4<f32>",mat3x2f:"mat3x2<f32>",mat3x3f:"mat3x3<f32>",mat3x4f:"mat3x4<f32>",mat4x2f:"mat4x2<f32>",mat4x3f:"mat4x3<f32>",mat4x4f:"mat4x4<f32>",mat2x2i:"mat2x2<i32>",mat2x3i:"mat2x3<i32>",mat2x4i:"mat2x4<i32>",mat3x2i:"mat3x2<i32>",mat3x3i:"mat3x3<i32>",mat3x4i:"mat3x4<i32>",mat4x2i:"mat4x2<i32>",mat4x3i:"mat4x3<i32>",mat4x4i:"mat4x4<i32>",mat2x2u:"mat2x2<u32>",mat2x3u:"mat2x3<u32>",mat2x4u:"mat2x4<u32>",mat3x2u:"mat3x2<u32>",mat3x3u:"mat3x3<u32>",mat3x4u:"mat3x4<u32>",mat4x2u:"mat4x2<u32>",mat4x3u:"mat4x3<u32>",mat4x4u:"mat4x4<u32>",mat2x2h:"mat2x2<f16>",mat2x3h:"mat2x3<f16>",mat2x4h:"mat2x4<f16>",mat3x2h:"mat3x2<f16>",mat3x3h:"mat3x3<f16>",mat3x4h:"mat3x4<f16>",mat4x2h:"mat4x2<f16>",mat4x3h:"mat4x3<f16>",mat4x4h:"mat4x4<f16>"};function xa(n,e={}){const t={...n},r=e.layout??"std140",i={};let s=0;for(const[o,a]of Object.entries(t))s=wo(i,o,a,s,r);return s=Ue(s,Je(t,r)),{layout:r,byteLength:s*4,uniformTypes:t,fields:i}}function Oi(n,e){const t=va(n),r=ya(t),i=/^mat(\d)x(\d)<.+>$/.exec(t);if(i){const o=Number(i[1]),a=Number(i[2]),c=Vc(a,t,r.type),l=j_(c.size,c.alignment,e);return{alignment:c.alignment,size:o*l,components:o*a,columns:o,rows:a,columnStride:l,shaderType:t,type:r.type}}const s=/^vec(\d)<.+>$/.exec(t);return s?Vc(Number(s[1]),t,r.type):{alignment:1,size:1,components:1,columns:1,rows:1,columnStride:1,shaderType:t,type:r.type}}function Df(n){return!!n&&typeof n=="object"&&!Array.isArray(n)}function wo(n,e,t,r,i){if(typeof t=="string"){const s=Oi(t,i),o=Ue(r,s.alignment);return n[e]={offset:o,...s},o+s.size}if(Array.isArray(t)){if(Array.isArray(t[0]))throw new Error(`Nested arrays are not supported for ${e}`);const s=t[0],o=t[1],a=$f(s,i),c=Ue(r,Je(t,i));for(let l=0;l<o;l++)wo(n,`${e}[${l}]`,s,c+l*a,i);return c+a*o}if(Df(t)){const s=Je(t,i);let o=Ue(r,s);for(const[a,c]of Object.entries(t))o=wo(n,`${e}.${a}`,c,o,i);return Ue(o,s)}throw new Error(`Unsupported CompositeShaderType for ${e}`)}function kf(n,e){if(typeof n=="string")return Oi(n,e).size;if(Array.isArray(n)){const r=n[0],i=n[1];if(Array.isArray(r))throw new Error("Nested arrays are not supported");return $f(r,e)*i}let t=0;for(const r of Object.values(n)){const i=r;t=Ue(t,Je(i,e)),t+=kf(i,e)}return Ue(t,Je(n,e))}function Je(n,e){if(typeof n=="string")return Oi(n,e).alignment;if(Array.isArray(n)){const r=n[0],i=Je(r,e);return Vf(e)?Math.max(i,4):i}let t=1;for(const r of Object.values(n)){const i=Je(r,e);t=Math.max(t,i)}return X_(e)?Math.max(t,4):t}function Vc(n,e,t,r){return{alignment:n===2?2:4,size:n===3?3:n,components:n,columns:1,rows:n,columnStride:n===3?3:n,shaderType:e,type:t}}function $f(n,e){const t=kf(n,e),r=Je(n,e);return H_(t,r,e)}function H_(n,e,t){return Ue(n,Vf(t)?4:e)}function j_(n,e,t){return t==="std140"?4:Ue(n,e)}function Vf(n){return n==="std140"||n==="wgsl-uniform"}function X_(n){return n==="std140"||n==="wgsl-uniform"}let hr;function Gf(n){return(!hr||hr.byteLength<n)&&(hr=new ArrayBuffer(n)),hr}function K_(n,e){const t=Gf(n.BYTES_PER_ELEMENT*e);return new n(t,0,e)}function q_(n){return ArrayBuffer.isView(n)&&!(n instanceof DataView)}function ei(n){return Array.isArray(n)?n.length===0||typeof n[0]=="number":q_(n)}class Y_{constructor(e){f(this,"layout");this.layout=e}has(e){return!!this.layout.fields[e]}get(e){const t=this.layout.fields[e];return t?{offset:t.offset,size:t.size}:void 0}getFlatUniformValues(e){const t={};for(const[r,i]of Object.entries(e)){const s=this.layout.uniformTypes[r];s?this._flattenCompositeValue(t,r,s,i):this.layout.fields[r]&&(t[r]=i)}return t}getData(e){const t=Gf(this.layout.byteLength);new Uint8Array(t,0,this.layout.byteLength).fill(0);const r={i32:new Int32Array(t),u32:new Uint32Array(t),f32:new Float32Array(t),f16:new Uint16Array(t)},i=this.getFlatUniformValues(e);for(const[s,o]of Object.entries(i))this._writeLeafValue(r,s,o);return new Uint8Array(t,0,this.layout.byteLength)}_flattenCompositeValue(e,t,r,i){if(i!==void 0){if(typeof r=="string"||this.layout.fields[t]){e[t]=i;return}if(Array.isArray(r)){const s=r[0],o=r[1];if(Array.isArray(s))throw new Error(`Nested arrays are not supported for ${t}`);if(typeof s=="string"&&ei(i)){this._flattenPackedArray(e,t,s,o,i);return}if(!Array.isArray(i)){S.warn(`Unsupported uniform array value for ${t}:`,i)();return}for(let a=0;a<Math.min(i.length,o);a++){const c=i[a];c!==void 0&&this._flattenCompositeValue(e,`${t}[${a}]`,s,c)}return}if(Df(r)&&Q_(i)){for(const[s,o]of Object.entries(i)){if(o===void 0)continue;const a=`${t}.${s}`;this._flattenCompositeValue(e,a,r[s],o)}return}S.warn(`Unsupported uniform value for ${t}:`,i)()}}_flattenPackedArray(e,t,r,i,s){const o=s,c=Oi(r,this.layout.layout).components;for(let l=0;l<i;l++){const u=l*c;if(u>=o.length)break;c===1?e[`${t}[${l}]`]=Number(o[u]):e[`${t}[${l}]`]=Z_(s,u,u+c)}}_writeLeafValue(e,t,r){const i=this.layout.fields[t];if(!i){S.warn(`Uniform ${t} not found in layout`)();return}const{type:s,components:o,columns:a,rows:c,offset:l,columnStride:u}=i,d=e[s];if(o===1){d[l]=Number(r);return}const h=r;if(a===1){for(let p=0;p<o;p++)d[l+p]=Number(h[p]??0);return}let m=0;for(let p=0;p<a;p++){const g=l+p*u;for(let b=0;b<c;b++)d[g+b]=Number(h[m++]??0)}}}function Q_(n){return!!n&&typeof n=="object"&&!Array.isArray(n)&&!ArrayBuffer.isView(n)}function Z_(n,e,t){return Array.prototype.slice.call(n,e,t)}const J_=128;function ey(n,e,t=16){if(n===e)return!0;const r=n,i=e;if(!ei(r)||!ei(i)||r.length!==i.length)return!1;const s=Math.min(t,J_);if(r.length>s)return!1;for(let o=0;o<r.length;++o)if(i[o]!==r[o])return!1;return!0}function ty(n){return ei(n)?n.slice():n}class ny{constructor(e){f(this,"name");f(this,"uniforms",{});f(this,"modifiedUniforms",{});f(this,"modified",!0);f(this,"bindingLayout",{});f(this,"needsRedraw","initialized");var t;if(this.name=(e==null?void 0:e.name)||"unnamed",e!=null&&e.name&&(e!=null&&e.shaderLayout)){const r=(t=e==null?void 0:e.shaderLayout.bindings)==null?void 0:t.find(s=>s.type==="uniform"&&s.name===(e==null?void 0:e.name));if(!r)throw new Error(e==null?void 0:e.name);const i=r;for(const s of i.uniforms||[])this.bindingLayout[s.name]=s}}setUniforms(e){for(const[t,r]of Object.entries(e))this._setUniform(t,r)&&!this.needsRedraw&&this.setNeedsRedraw(`${this.name}.${t}=${r}`)}setNeedsRedraw(e){this.needsRedraw=this.needsRedraw||e}getAllUniforms(){return this.modifiedUniforms={},this.needsRedraw=!1,this.uniforms||{}}_setUniform(e,t){return ey(this.uniforms[e],t)?!1:(this.uniforms[e]=ty(t),this.modifiedUniforms[e]=!0,this.modified=!0,!0)}}const ry=1024;class Sa{constructor(e,t){f(this,"device");f(this,"uniformBlocks",new Map);f(this,"shaderBlockLayouts",new Map);f(this,"shaderBlockWriters",new Map);f(this,"uniformBuffers",new Map);this.device=e;for(const[r,i]of Object.entries(t)){const s=r,o=xa(i.uniformTypes??{},{layout:i.layout??iy(e)}),a=new Y_(o);this.shaderBlockLayouts.set(s,o),this.shaderBlockWriters.set(s,a);const c=new ny({name:r});c.setUniforms(a.getFlatUniformValues(i.defaultUniforms||{})),this.uniformBlocks.set(s,c)}}destroy(){for(const e of this.uniformBuffers.values())e.destroy()}setUniforms(e,t){var r;for(const[i,s]of Object.entries(e)){const o=i,a=this.shaderBlockWriters.get(o),c=a==null?void 0:a.getFlatUniformValues(s||{});(r=this.uniformBlocks.get(o))==null||r.setUniforms(c||{})}this.updateUniformBuffers(t)}getUniformBufferByteLength(e){var r;const t=((r=this.shaderBlockLayouts.get(e))==null?void 0:r.byteLength)||0;return Math.max(t,ry)}getUniformBufferData(e){var i;const t=((i=this.uniformBlocks.get(e))==null?void 0:i.getAllUniforms())||{},r=this.shaderBlockWriters.get(e);return(r==null?void 0:r.getData(t))||new Uint8Array(0)}createUniformBuffer(e,t){t&&this.setUniforms(t);const r=this.getUniformBufferByteLength(e),i=this.device.createBuffer({usage:F.UNIFORM|F.COPY_DST,byteLength:r}),s=this.getUniformBufferData(e);return i.write(s),i}getManagedUniformBuffer(e){if(!this.uniformBuffers.get(e)){const t=this.getUniformBufferByteLength(e),r=this.device.createBuffer({usage:F.UNIFORM|F.COPY_DST,byteLength:t});this.uniformBuffers.set(e,r)}return this.uniformBuffers.get(e)}updateUniformBuffers(e){let t=!1;for(const r of this.uniformBlocks.keys()){const i=this.updateUniformBuffer(r,e);t||(t=i)}return t&&S.log(3,`UniformStore.updateUniformBuffers(): ${t}`)(),t}updateUniformBuffer(e,t){var o;const r=this.uniformBlocks.get(e);let i=this.uniformBuffers.get(e),s=!1;if(i&&(r!=null&&r.needsRedraw)){s||(s=r.needsRedraw);const a=this.getUniformBufferData(e);if(i=this.uniformBuffers.get(e),i&&(t?this.device.writeBufferViaCommandEncoder(t,i,a):i.write(a)),S.level>=4){const c=(o=this.uniformBlocks.get(e))==null?void 0:o.getAllUniforms();S.log(4,`Writing to uniform buffer ${String(e)}`,a,c)()}}return s}}function iy(n){return n.type==="webgpu"?"wgsl-uniform":"std140"}function To(n){return n.attributes?n.attributes.map(e=>e.attribute):[n.name]}function sy(n){return Object.fromEntries(n.attributes.map(e=>[e.name,e.location]))}function Gc(n){let e=1/0;for(const t of n)t!==void 0&&(e=Math.min(e,t));return e}function oy(n,e,t){ay(e);const r=new Map;for(const i of e){const s=cy(i);if(i.attributes)for(const o of i.attributes)r.has(o.attribute)||r.set(o.attribute,{bufferName:i.name,stepMode:i.stepMode,vertexFormat:o.format,byteOffset:o.byteOffset,byteStride:s});else i.format&&!r.has(i.name)&&r.set(i.name,{bufferName:i.name,stepMode:i.stepMode,vertexFormat:i.format,byteOffset:0,byteStride:s})}return n.attributes.map(i=>{const s=r.get(i.name);!s&&(t!=null&&t.warnOnMissingBufferLayout)&&S.warn(`layout for attribute "${i.name}" not present in buffer layout`)();const o=en.getAttributeShaderTypeInfo(i.type),a=(s==null?void 0:s.vertexFormat)||ae.getCompatibleVertexFormat(o);return{attributeName:i.name,bufferName:(s==null?void 0:s.bufferName)||i.name,location:i.location,vertexFormat:a,byteOffset:(s==null?void 0:s.byteOffset)??0,byteStride:(s==null?void 0:s.byteStride)??ae.getVertexFormatInfo(a).byteLength,stepMode:(s==null?void 0:s.stepMode)||i.stepMode||(i.name.startsWith("instance")?"instance":"vertex")}}).sort((i,s)=>i.location-s.location)}function ay(n){for(const e of n)(e.attributes&&e.format||!e.attributes&&!e.format)&&S.warn(`BufferLayout ${e.name} must have either 'attributes' or 'format' field`)()}function cy(n){if(typeof n.byteStride=="number")return n.byteStride;if(n.attributes){let e=0;for(const t of n.attributes)e+=ae.getVertexFormatInfo(t.format).byteLength;return e}return ae.getVertexFormatInfo(n.format).byteLength}function zf(n,e){const t={},r=oy(n,e,{warnOnMissingBufferLayout:!0});for(const i of r){const s=ly(n,i);t[i.attributeName]=s}return t}function ly(n,e){const t=uy(n,e.attributeName),r=en.getAttributeShaderTypeInfo(t.type),i=e.vertexFormat,s=ae.getVertexFormatInfo(i);return{attributeName:e.attributeName,bufferName:e.bufferName,location:t.location,shaderType:t.type,primitiveType:r.primitiveType,shaderComponents:r.components,vertexFormat:i,bufferDataType:s.type,bufferComponents:s.components,normalized:s.normalized,integer:r.integer,stepMode:e.stepMode,byteOffset:e.byteOffset,byteStride:e.byteStride}}function uy(n,e){const t=n.attributes.find(r=>r.name===e);return t||S.warn(`shader layout attribute "${e}" not present in shader`)(),t||null}const fy=/^(vs|fs):(?:#(?:decl|main-start|main-end)|[A-Za-z_][\w-]*)$/;function Wf(n=[],e){const t=[],r={},i={},s={},o={};for(const a of n)zc({modules:t,defines:r,injections:i,vertexInputs:s,varyings:o},a),zc({modules:t,defines:r,injections:i,vertexInputs:s,varyings:o},a[e]);for(const a of Object.keys(o))if(s[a])throw new Error(`ShaderPlugin name "${a}" cannot be both a vertex input and a varying`);return{modules:t,defines:r,injections:i,vertexInputs:s,varyings:o}}function Hf(n=[],e=[]){const t=[...n],r=new Set(t.map(i=>i.name));for(const i of e)r.has(i.name)||(t.push(i),r.add(i.name));return t}function zc(n,e){var t;if(e){(t=e.modules)!=null&&t.length&&n.modules.push(...e.modules),e.defines&&Object.assign(n.defines,e.defines);for(const[r,i]of Object.entries(e.vertexInputs||{})){Wc(r,"vertex input");const s=n.vertexInputs[r];if(s&&s!==i)throw new Error(`ShaderPlugin vertex input "${r}" has conflicting types "${s}" and "${i}"`);n.vertexInputs[r]=i}for(const[r,i]of Object.entries(e.varyings||{})){Wc(r,"varying");const s=dy(r,i),o=n.varyings[r];if(o&&(o.type!==s.type||o.interpolation!==s.interpolation))throw new Error(`ShaderPlugin varying "${r}" has conflicting declarations "${o.type}/${o.interpolation}" and "${s.type}/${s.interpolation}"`);n.varyings[r]=s}for(const r of e.injections||[])hy(r.target),n.injections[r.target]||(n.injections[r.target]=[]),n.injections[r.target].push({injection:r.injection,order:r.order??0})}}function Wc(n,e){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)||n.startsWith("_luma_"))throw new Error(`ShaderPlugin ${e} "${n}" must be a valid non-reserved identifier`)}function dy(n,e){const{primitiveType:t}=en.getAttributeShaderTypeInfo(e.type),r=t==="i32"||t==="u32",i=e.interpolation||(r?"flat":"smooth");if(r&&i==="smooth")throw new Error(`ShaderPlugin integer varying "${n}" must use flat interpolation`);return{type:e.type,interpolation:i}}function hy(n){if(!fy.test(n))throw new Error(`ShaderPlugin injection target "${n}" must be a named shader anchor or hook`)}const my=/^(?:uniform\s+)?(?:(?:lowp|mediump|highp)\s+)?[A-Za-z0-9_]+(?:<[^>]+>)?\s+([A-Za-z0-9_]+)(?:\s*\[[^\]]+\])?\s*;/,py=/((?:layout\s*\([^)]*\)\s*)*)uniform\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*?)\}\s*([A-Za-z_][A-Za-z0-9_]*)?\s*;/g;function wa(n){return`${n.name}Uniforms`}function gy(n,e){const t=e==="wgsl"?n.source:e==="vertex"?n.vs:n.fs;if(!t)return null;const r=wa(n);return vy(t,e==="wgsl"?"wgsl":"glsl",r)}function by(n,e){const t=Object.keys(n.uniformTypes||{});if(!t.length)return null;const r=gy(n,e);return r?{moduleName:n.name,uniformBlockName:wa(n),stage:e,expectedUniformNames:t,actualUniformNames:r,matches:wy(t,r)}:null}function _y(n,e,t={}){var s,o;const r=by(n,e);if(!r||r.matches)return r;const i=Ty(r);return(o=(s=t.log)==null?void 0:s.error)==null||o.call(s,i,r)(),t.throwOnError!==!1&&Zt(!1,i),r}function Ta(n){var r;const e=[],t=Ey(n);for(const i of t.matchAll(py)){const s=((r=i[1])==null?void 0:r.trim())||null;e.push({blockName:i[2],body:i[3],instanceName:i[4]||null,layoutQualifier:s,hasLayoutQualifier:!!s,isStd140:!!(s&&/\blayout\s*\([^)]*\bstd140\b[^)]*\)/.exec(s))})}return e}function yy(n,e,t,r){var o;const i=Ta(n).filter(a=>!a.isStd140),s=new Set;for(const a of i){if(s.has(a.blockName))continue;s.add(a.blockName);const c="",l=a.hasLayoutQualifier?`declares ${Ay(a.layoutQualifier)} instead of layout(std140)`:"does not declare layout(std140)",u=`${c}${e} shader uniform block ${a.blockName} ${l}. luma.gl host-side shader block packing assumes explicit layout(std140) for GLSL uniform blocks. Add \`layout(std140)\` to the block declaration.`;(o=t==null?void 0:t.warn)==null||o.call(t,u,a)()}return i}function vy(n,e,t){const r=e==="wgsl"?xy(n,t):Sy(n,t);if(!r)return null;const i=[];for(const s of r.split(`
`)){const o=s.replace(/\/\/.*$/,"").trim();if(!o||o.startsWith("#"))continue;const a=e==="wgsl"?o.match(/^([A-Za-z0-9_]+)\s*:/):o.match(my);a&&i.push(a[1])}return i}function xy(n,e){const t=new RegExp(`\\bstruct\\s+${e}\\b`,"m").exec(n);if(!t)return null;const r=n.indexOf("{",t.index);if(r<0)return null;let i=0;for(let s=r;s<n.length;s++){const o=n[s];if(o==="{"){i++;continue}if(o==="}"&&(i--,i===0))return n.slice(r+1,s)}return null}function Sy(n,e){const t=Ta(n).find(r=>r.blockName===e);return(t==null?void 0:t.body)||null}function wy(n,e){if(n.length!==e.length)return!1;for(let t=0;t<n.length;t++)if(n[t]!==e[t])return!1;return!0}function Ty(n){const{expectedUniformNames:e,actualUniformNames:t}=n,r=e.filter(a=>!t.includes(a)),i=t.filter(a=>!e.includes(a)),s=[`Expected ${e.length} fields, found ${t.length}.`],o=Ry(e,t);return o&&s.push(o),r.length&&s.push(`Missing from shader block (${r.length}): ${Hc(r)}.`),i.length&&s.push(`Unexpected in shader block (${i.length}): ${Hc(i)}.`),e.length<=12&&t.length<=12&&(r.length||i.length)&&(s.push(`Expected: ${e.join(", ")}.`),s.push(`Actual: ${t.join(", ")}.`)),`${n.moduleName}: ${n.stage} shader uniform block ${n.uniformBlockName} does not match module.uniformTypes. ${s.join(" ")}`}function Ey(n){return n.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\/\/.*$/gm,"")}function Ay(n){return n.replace(/\s+/g," ").trim()}function Ry(n,e){const t=Math.min(n.length,e.length);for(let r=0;r<t;r++)if(n[r]!==e[r])return`First mismatch at field ${r+1}: expected ${n[r]}, found ${e[r]}.`;return n.length>e.length?`Shader block ends after field ${e.length}; expected next field ${n[e.length]}.`:e.length>n.length?`Shader block has extra field ${e.length}: ${e[n.length]}.`:null}function Hc(n,e=8){if(n.length<=e)return n.join(", ");const t=n.length-e;return`${n.slice(0,e).join(", ")}, ... (${t} more)`}function Iy(n){switch(n==null?void 0:n.gpu.toLowerCase()){case"apple":return`#define APPLE_GPU
// Apple optimizes away the calculation necessary for emulated fp64
#define LUMA_FP64_CODE_ELIMINATION_WORKAROUND 1
#define LUMA_FP32_TAN_PRECISION_WORKAROUND 1
// Intel GPU doesn't have full 32 bits precision in same cases, causes overflow
#define LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND 1
`;case"nvidia":return`#define NVIDIA_GPU
// Nvidia optimizes away the calculation necessary for emulated fp64
#define LUMA_FP64_CODE_ELIMINATION_WORKAROUND 1
`;case"intel":return`#define INTEL_GPU
// Intel optimizes away the calculation necessary for emulated fp64
#define LUMA_FP64_CODE_ELIMINATION_WORKAROUND 1
// Intel's built-in 'tan' function doesn't have acceptable precision
#define LUMA_FP32_TAN_PRECISION_WORKAROUND 1
// Intel GPU doesn't have full 32 bits precision in same cases, causes overflow
#define LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND 1
`;case"amd":return`#define AMD_GPU
`;default:return`#define DEFAULT_GPU
// Prevent driver from optimizing away the calculation necessary for emulated fp64
#define LUMA_FP64_CODE_ELIMINATION_WORKAROUND 1
// Headless Chrome's software shader 'tan' function doesn't have acceptable precision
#define LUMA_FP32_TAN_PRECISION_WORKAROUND 1
// If the GPU doesn't have full 32 bits precision, will causes overflow
#define LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND 1
`}}function My(n,e){var r;if(Number(((r=n.match(/^#version[ \t]+(\d+)/m))==null?void 0:r[1])||100)!==300)throw new Error("luma.gl v9 only supports GLSL 3.00 shader sources");switch(e){case"vertex":return n=jc(n,Ly),n;case"fragment":return n=jc(n,Cy),n;default:throw new Error(e)}}const jf=[[/^(#version[ \t]+(100|300[ \t]+es))?[ \t]*\n/,`#version 300 es
`],[/\btexture(2D|2DProj|Cube)Lod(EXT)?\(/g,"textureLod("],[/\btexture(2D|2DProj|Cube)(EXT)?\(/g,"texture("]],Ly=[...jf,[Eo("attribute"),"in $1"],[Eo("varying"),"out $1"]],Cy=[...jf,[Eo("varying"),"in $1"]];function jc(n,e){for(const[t,r]of e)n=n.replace(t,r);return n}function Eo(n){return new RegExp(`\\b${n}[ \\t]+(\\w+[ \\t]+\\w+(\\[\\w+\\])?;)`,"g")}function Ao(n,e,t="glsl"){let r="";for(const i in n){const s=n[i];if(r+=`${t==="wgsl"?"fn":"void"} ${s.signature} {
`,s.header&&(r+=`  ${s.header}`),e[i]){const a=e[i];a.sort((c,l)=>c.order-l.order);for(const c of a)r+=`  ${c.injection}
`}s.footer&&(r+=`  ${s.footer}`),r+=`}
`}return r}function Xf(n){const e={vertex:{},fragment:{}};for(const t of n){let r,i;typeof t!="string"?(r=t,i=r.hook):(r={},i=t),i=i.trim();const s=i.indexOf(":"),o=i.slice(0,s),a=i.slice(s+1),c=i.replace(/\(.+/,""),l=Object.assign(r,{signature:a});switch(o){case"vs":e.vertex[c]=l;break;case"fs":e.fragment[c]=l;break;default:throw new Error(o)}}return e}function Py(n,e){return{name:By(n,e),language:"glsl",version:Ny(n)}}function By(n,e="unnamed"){const r=/#define[^\S\r\n]*SHADER_NAME[^\S\r\n]*([A-Za-z0-9_-]+)\s*/.exec(n);return r?r[1]:e}function Ny(n){let e=100;const t=n.match(/[^\s]+/g);if(t&&t.length>=2&&t[0]==="#version"){const r=parseInt(t[1],10);Number.isFinite(r)&&(e=r)}if(e!==100&&e!==300)throw new Error(`Invalid GLSL version ${e}`);return e}const Xc=[new RegExp(`@binding\\(\\s*(\\d+)\\s*\\)\\s*@group\\(\\s*(\\d+)\\s*\\)\\s*${ye}\\s*:\\s*([^;]+);`,"g"),new RegExp(`@group\\(\\s*(\\d+)\\s*\\)\\s*@binding\\(\\s*(\\d+)\\s*\\)\\s*${ye}\\s*:\\s*([^;]+);`,"g")];function Kf(n,e=[]){var s;const t=Pi(n),r=new Map;for(const o of e)r.set(Kc(o.name,o.group,o.location),o.moduleName);const i=[];for(const o of Xc){o.lastIndex=0;let a;for(a=o.exec(t);a;){const c=o===Xc[0],l=Number(a[c?1:2]),u=Number(a[c?2:1]),d=(s=a[3])==null?void 0:s.trim(),h=a[4],m=a[5].trim(),p=r.get(Kc(h,u,l));i.push(Oy({name:h,group:u,binding:l,owner:p?"module":"application",moduleName:p,accessDeclaration:d,resourceType:m})),a=o.exec(t)}}return i.sort((o,a)=>o.group!==a.group?o.group-a.group:o.binding!==a.binding?o.binding-a.binding:o.name.localeCompare(a.name))}function Oy(n){const e={name:n.name,group:n.group,binding:n.binding,owner:n.owner,kind:"unknown",moduleName:n.moduleName,resourceType:n.resourceType};if(n.accessDeclaration){const t=n.accessDeclaration.split(",").map(r=>r.trim());if(t[0]==="uniform")return{...e,kind:"uniform",access:"uniform"};if(t[0]==="storage"){const r=t[1]||"read_write";return{...e,kind:r==="read"?"read-only-storage":"storage",access:r}}}return n.resourceType==="sampler"||n.resourceType==="sampler_comparison"?{...e,kind:"sampler",samplerKind:n.resourceType==="sampler_comparison"?"comparison":"filtering"}:n.resourceType.startsWith("texture_storage_")?{...e,kind:"storage-texture",access:Uy(n.resourceType),viewDimension:qc(n.resourceType)}:n.resourceType.startsWith("texture_")?{...e,kind:"texture",viewDimension:qc(n.resourceType),sampleType:Fy(n.resourceType),multisampled:n.resourceType.startsWith("texture_multisampled_")}:e}function Kc(n,e,t){return`${e}:${t}:${n}`}function qc(n){if(n.includes("cube_array"))return"cube-array";if(n.includes("2d_array"))return"2d-array";if(n.includes("cube"))return"cube";if(n.includes("3d"))return"3d";if(n.includes("2d"))return"2d";if(n.includes("1d"))return"1d"}function Fy(n){if(n.startsWith("texture_depth_"))return"depth";if(n.includes("<i32>"))return"sint";if(n.includes("<u32>"))return"uint";if(n.includes("<f32>"))return"float"}function Uy(n){const e=/,\s*([A-Za-z_][A-Za-z0-9_]*)\s*>$/.exec(n);return e==null?void 0:e[1]}const ct="([a-zA-Z_][a-zA-Z0-9_]*)",Dy=/^\s*\#\s*if\s+(.+?)\s*(?:\/\/.*)?$/,ky=new RegExp(`^\\s*\\#\\s*ifdef\\s*${ct}\\s*$`),$y=new RegExp(`^\\s*\\#\\s*ifndef\\s*${ct}\\s*(?:\\/\\/.*)?$`),Vy=/^\s*\#\s*else\s*(?:\/\/.*)?$/,Gy=/^\s*\#\s*endif\s*$/,zy=new RegExp(`^\\s*\\#\\s*ifdef\\s*${ct}\\s*(?:\\/\\/.*)?$`),Wy=/^\s*\#\s*endif\s*(?:\/\/.*)?$/;function Dn(n,e){var o,a;const t=n.split(`
`),r=[],i=[];let s=!0;for(const c of t){const l=c.match(Dy),u=c.match(zy)||c.match(ky),d=c.match($y),h=c.match(Vy),m=c.match(Wy)||c.match(Gy);if(l){const p=Hy(l[1],(e==null?void 0:e.defines)||{}),g=s&&p;i.push({parentActive:s,branchTaken:p,active:g}),s=g}else if(u||d){const p=(o=u||d)==null?void 0:o[1],g=!!((a=e==null?void 0:e.defines)!=null&&a[p]),b=u?g:!g,_=s&&b;i.push({parentActive:s,branchTaken:b,active:_}),s=_}else if(h){const p=i[i.length-1];if(!p)throw new Error("Encountered #else without matching #if, #ifdef or #ifndef");p.active=p.parentActive&&!p.branchTaken,p.branchTaken=!0,s=p.active}else m?(i.pop(),s=i.length?i[i.length-1].active:!0):s&&r.push(c)}if(i.length>0)throw new Error("Unterminated conditional block in shader source");return r.join(`
`)}function Hy(n,e){const t=n.trim();if(/^[+-]?\d+(?:\.\d+)?$/.test(t))return Number(t)!==0;if(t==="true")return!0;if(t==="false")return!1;const r=t.match(new RegExp(`^!\\s*${ct}$`));if(r)return!e[r[1]];const i=t.match(new RegExp(`^${ct}$`));if(i)return!!e[i[1]];const s=t.match(new RegExp(`^defined\\s*\\(\\s*${ct}\\s*\\)$`));if(s)return e[s[1]]!==void 0;const o=t.match(new RegExp(`^!\\s*defined\\s*\\(\\s*${ct}\\s*\\)$`));if(o)return e[o[1]]===void 0;throw new Error(`Unsupported #if expression "${n}"`)}function jy(n,e){const t=[];for(const[r,i]of Object.entries(e))Ky(n,r),t.push(`in ${Ea(i)} ${r};`);return t.join(`
`)}function Xy(n,e,t){const r=Object.entries(t);if(r.length===0)return{source:n,declarations:"",initialization:""};const i=qy(n,e),s=n.slice(i.openParenthesis+1,i.closeParenthesis),o=Yy(n,s),a=new Set(o.locations),c=[],l=[],u=[];for(const[g,b]of r){if(o.names.has(g)||Jy(n,g))throw new Error(`ShaderPlugin vertex input "${g}" conflicts with an existing WGSL shader input or variable`);const _=e0(a);a.add(_);const y=`_luma_${g}`;c.push(`@location(${_}) ${y}: ${b}`),l.push(`var<private> ${g}: ${b};`),u.push(`${g} = ${y};`)}const d=s.trim()?`,
  `:`
  `,h=s.trim()?"":`
`,m=`${s}${d}${c.join(`,
  `)}${h}`;return{source:n.slice(0,i.openParenthesis+1)+m+n.slice(i.closeParenthesis),declarations:l.join(`
`),initialization:u.join(`
`)}}function Ea(n){const{primitiveType:e,components:t}=en.getAttributeShaderTypeInfo(n),r=e==="i32"?"int":e==="u32"?"uint":"float";return t===1?r:`${r==="int"?"i":r==="uint"?"u":""}vec${t}`}function Ky(n,e){const t=Fi(e);if(new RegExp(`\\b(?:in|attribute)\\s+(?:(?:lowp|mediump|highp)\\s+)?[A-Za-z_][A-Za-z0-9_]*\\s+${t}\\s*(?:\\[|;)`).test(n))throw new Error(`ShaderPlugin vertex input "${e}" conflicts with an existing GLSL input`)}function qy(n,e){const r=new RegExp(`\\bfn\\s+${Fi(e)}\\s*\\(`,"g").exec(n);if(!r)throw new Error(`ShaderPlugin vertex inputs require WGSL vertex entry point "${e}"`);const i=n.indexOf("(",r.index),s=qf(n,i,"(",")");if(s<0)throw new Error(`Unable to parse WGSL vertex entry point "${e}" parameters`);return{openParenthesis:i,closeParenthesis:s}}function Yy(n,e){const t=Yc(e),r=new Set(Qc(e)),i=Qy(e);for(const s of i){const o=Zy(n,s);if(o!==null){t.push(...Yc(o));for(const a of Qc(o))r.add(a)}}return{locations:t,names:r}}function Yc(n){const e=[],t=/@location\s*\(\s*(\d+)\s*\)/g;let r=t.exec(n);for(;r;)e.push(Number(r[1])),r=t.exec(n);return e}function Qc(n){const e=[],t=/(?:^|,)\s*(?:@[A-Za-z_][\w]*(?:\([^)]*\))?\s*)*([A-Za-z_][\w]*)\s*:/gm;let r=t.exec(n);for(;r;)e.push(r[1]),r=t.exec(n);return e}function Qy(n){const e=[],t=/:\s*([A-Za-z_][\w]*)\b/g;let r=t.exec(n);for(;r;)e.push(r[1]),r=t.exec(n);return e}function Zy(n,e){const r=new RegExp(`\\bstruct\\s+${Fi(e)}\\s*\\{`,"g").exec(n);if(!r)return null;const i=n.indexOf("{",r.index),s=qf(n,i,"{","}");return s<0?null:n.slice(i+1,s)}function Jy(n,e){const t=Fi(e),r=new RegExp(`\\b(?:var(?:<[^>]+>)?|let|const)\\s+${t}\\b`,"g");let i=r.exec(n);for(;i;){if(t0(n,i.index)===0)return!0;i=r.exec(n)}return!1}function e0(n){let e=0;for(;n.has(e);)e++;return e}function qf(n,e,t,r){let i=0,s=0,o=!1;for(let a=e;a<n.length;a++){const c=n[a],l=n[a+1];if(o){c===`
`&&(o=!1);continue}if(s>0){c==="/"&&l==="*"?(s++,a++):c==="*"&&l==="/"&&(s--,a++);continue}if(c==="/"&&l==="/"){o=!0,a++;continue}if(c==="/"&&l==="*"){s=1,a++;continue}if(c===t&&i++,c===r&&--i===0)return a}return-1}function t0(n,e){let t=0,r=0,i=!1;for(let s=0;s<e;s++){const o=n[s],a=n[s+1];if(i){o===`
`&&(i=!1);continue}if(r>0){o==="/"&&a==="*"?(r++,s++):o==="*"&&a==="/"&&(r--,s++);continue}o==="/"&&a==="/"?(i=!0,s++):o==="/"&&a==="*"?(r=1,s++):o==="{"?t++:o==="}"&&t--}return t}function Fi(n){return n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function n0(n,e,t){const r=[],i=[];for(const[s,o]of Object.entries(t)){g0(n,s);const a=o.interpolation==="flat"?"flat ":"",c=e==="vertex"?"out":"in";r.push(`${a}${c} ${Ea(o.type)} ${s};`),e==="vertex"&&i.push(`${s} = ${m0(o.type)};`)}return{declarations:r.join(`
`),initialization:i.join(`
`)}}function r0(n,e,t,r){const i=Object.entries(r);if(i.length===0)return{source:n,declarations:"",vertexInitialization:"",fragmentInitialization:""};let s=n,o=mr(s,e,"vertex");const a=i0(s,o);let c=mr(s,t,"fragment");const l=s0(s,c),u=ms(s,a),d=ms(s,l.type),h=new Set([...pr(o.parameters),...pr(u.body),...pr(c.parameters),...pr(d.body)]),m=new Set([...Zc(u.body),...Zc(d.body)]),p=[],g=[],b=[],_=[];for(const[x,T]of i){if(h.has(x)||d0(s,x))throw new Error(`ShaderPlugin varying "${x}" conflicts with existing WGSL stage I/O or a module variable`);const A=h0(m);m.add(A);const M=T.interpolation==="flat"?" @interpolate(flat)":"";p.push(`  @location(${A})${M} ${x}: ${T.type},`),g.push(`var<private> ${x}: ${T.type};`),b.push(`${x} = ${p0(T.type)};`),_.push(`${x} = ${l.name}.${x};`)}o0(s,a,o.openBrace,o.closeBrace),s=a0(s,a,o,i.map(([x])=>x)),o=mr(s,e,"vertex"),s=c0(s,o,i.map(([x])=>x));const v=(a===l.type?[a]:[a,l.type]).map(x=>ms(s,x).closeBrace).sort((x,T)=>T-x);for(const x of v)s=s.slice(0,x)+`${p.join(`
`)}
`+s.slice(x);if(c=mr(s,t,"fragment"),!new RegExp(`\\b${xt(l.name)}\\s*:`).test(c.parameters))throw new Error(`Unable to preserve WGSL fragment input "${l.name}"`);return{source:s,declarations:g.join(`
`),vertexInitialization:b.join(`
`),fragmentInitialization:_.join(`
`)}}function mr(n,e,t){const i=new RegExp(`\\bfn\\s+${xt(e)}\\s*\\(`,"g").exec(n);if(!i)throw new Error(`ShaderPlugin varyings require WGSL ${t} entry point "${e}"`);const s=n.indexOf("(",i.index),o=ti(n,s,"(",")"),a=n.indexOf("{",o),c=ti(n,a,"{","}");if(o<0||a<0||c<0)throw new Error(`Unable to parse WGSL ${t} entry point "${e}"`);return{openParenthesis:s,closeParenthesis:o,openBrace:a,closeBrace:c,parameters:n.slice(s+1,o)}}function i0(n,e){const t=n.slice(e.closeParenthesis+1,e.openBrace),r=/->\s*([A-Za-z_][\w]*)\s*$/.exec(t.trim());if(!r||Aa(n,r[1])===null)throw new Error("ShaderPlugin varyings require the WGSL vertex entry point to return a named struct");return r[1]}function s0(n,e){const t=[];for(const r of f0(e.parameters,",")){const i=/(?:@[A-Za-z_][\w]*(?:\([^)]*\))?\s*)*([A-Za-z_][\w]*)\s*:\s*([A-Za-z_][\w]*)\s*$/.exec(r.trim());i&&Aa(n,i[2])&&t.push({name:i[1],type:i[2]})}if(t.length!==1)throw new Error(`ShaderPlugin varyings require exactly one named WGSL fragment input struct; found ${t.length}`);return t[0]}function ms(n,e){const t=Aa(n,e);if(!t)throw new Error(`Unable to find WGSL stage I/O struct "${e}"`);return t}function Aa(n,e){const r=new RegExp(`\\bstruct\\s+${xt(e)}\\s*\\{`,"g").exec(n);if(!r)return null;const i=n.indexOf("{",r.index),s=ti(n,i,"{","}");return s<0?null:{openBrace:i,closeBrace:s,body:n.slice(i+1,s)}}function o0(n,e,t,r){const i=new RegExp(`\\b${xt(e)}\\s*\\(`,"g");let s=i.exec(n);for(;s;){if(s.index<t||s.index>r)throw new Error(`ShaderPlugin varying output struct "${e}" is constructed outside the selected vertex entry point`);s=i.exec(n)}}function a0(n,e,t,r){const i=new RegExp(`\\b${xt(e)}\\s*\\(`,"g"),s=[];let o=i.exec(n);for(;o;){if(o.index>t.openBrace&&o.index<t.closeBrace){const a=n.indexOf("(",o.index),c=ti(n,a,"(",")");if(c<0||c>t.closeBrace)throw new Error(`Unable to parse WGSL output constructor "${e}"`);s.push({openParenthesis:a,closeParenthesis:c})}o=i.exec(n)}for(const a of s.sort((c,l)=>l.closeParenthesis-c.closeParenthesis)){const l=n.slice(a.openParenthesis+1,a.closeParenthesis).trim()?", ":"";n=n.slice(0,a.closeParenthesis)+l+r.join(", ")+n.slice(a.closeParenthesis)}return n}function c0(n,e,t){const r=l0(n,e.openBrace+1,e.closeBrace);for(let i=r.length-1;i>=0;i--){const s=r[i],o=n.slice(s.expressionStart,s.semicolon).trim();if(!o)throw new Error("ShaderPlugin varying vertex entry point cannot use an empty return");const a=`_luma_vertexOutput${i}`,c=t.map(u=>`${a}.${u} = ${u};`).join(`
`),l=`{
var ${a} = ${o};
${c}
return ${a};
}`;n=n.slice(0,s.start)+l+n.slice(s.semicolon+1)}return n}function l0(n,e,t){const r=[];let i=e;for(;i<t;)if(i=Ra(n,i,t),n.slice(i,i+6)==="return"&&!/[A-Za-z0-9_]/.test(n[i+6]||"")){const s=i+6,o=u0(n,s,t);if(o<0)throw new Error("Unable to parse WGSL return statement in selected vertex entry point");r.push({start:i,expressionStart:s,semicolon:o}),i=o+1}else i++;return r}function u0(n,e,t){let r=0,i=0;for(let s=e;s<t;s++){const o=Ra(n,s,t);if(o!==s){s=o-1;continue}const a=n[s];if(a==="("&&r++,a===")"&&r--,a==="["&&i++,a==="]"&&i--,a===";"&&r===0&&i===0)return s}return-1}function Ra(n,e,t){let r=e;if(n[r]==="/"&&n[r+1]==="/"){const i=n.indexOf(`
`,r+2);return i<0||i>t?t:i+1}if(n[r]==="/"&&n[r+1]==="*"){let i=1;for(r+=2;r<t&&i>0;)n[r]==="/"&&n[r+1]==="*"?(i++,r+=2):n[r]==="*"&&n[r+1]==="/"?(i--,r+=2):r++}return r}function f0(n,e){const t=[];let r=0,i=0,s=0;for(let o=0;o<n.length;o++){const a=n[o];a==="("&&i++,a===")"&&i--,a==="<"&&s++,a===">"&&s--,a===e&&i===0&&s===0&&(t.push(n.slice(r,o)),r=o+1)}return t.push(n.slice(r)),t}function Zc(n){const e=[],t=/@location\s*\(\s*(\d+)\s*\)/g;let r=t.exec(n);for(;r;)e.push(Number(r[1])),r=t.exec(n);return e}function pr(n){const e=[],t=/(?:^|,)\s*(?:@[A-Za-z_][\w]*(?:\([^)]*\))?\s*)*([A-Za-z_][\w]*)\s*:/gm;let r=t.exec(n);for(;r;)e.push(r[1]),r=t.exec(n);return e}function d0(n,e){const t=new RegExp(`\\b(?:var(?:<[^>]+>)?|let|const)\\s+${xt(e)}\\b`,"g");let r=t.exec(n);for(;r;){if(b0(n,r.index)===0)return!0;r=t.exec(n)}return!1}function h0(n){let e=0;for(;n.has(e);)e++;return e}function m0(n){const{primitiveType:e,components:t}=en.getAttributeShaderTypeInfo(n),r=e==="u32"?"0u":e==="i32"?"0":"0.0";return t===1?r:`${Ea(n)}(${r})`}function p0(n){const{primitiveType:e,components:t}=en.getAttributeShaderTypeInfo(n),r=`${e}(0)`;return t===1?r:`${n}(${r})`}function g0(n,e){if(new RegExp(`\\b(?:flat\\s+|smooth\\s+)?(?:in|out|varying)\\s+(?:(?:lowp|mediump|highp)\\s+)?[A-Za-z_][A-Za-z0-9_]*\\s+${xt(e)}\\s*(?:\\[|;)`).test(n))throw new Error(`ShaderPlugin varying "${e}" conflicts with existing GLSL stage I/O`)}function ti(n,e,t,r){let i=0,s=0,o=!1;for(let a=e;a<n.length;a++){const c=n[a],l=n[a+1];if(o){c===`
`&&(o=!1);continue}if(s>0){c==="/"&&l==="*"?(s++,a++):c==="*"&&l==="/"&&(s--,a++);continue}if(c==="/"&&l==="/"){o=!0,a++;continue}if(c==="/"&&l==="*"){s=1,a++;continue}if(c===t&&i++,c===r&&--i===0)return a}return-1}function b0(n,e){let t=0;for(let r=0;r<e;r++){const i=Ra(n,r,e);if(i!==r){r=i-1;continue}n[r]==="{"&&t++,n[r]==="}"&&t--}return t}function xt(n){return n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}const Ia=`

${Or}
`,kn=100,_0=`precision highp float;
`;function y0(n){const e=Xr(n.modules||[]),{source:t,bindingAssignments:r}=x0(n.platformInfo,{...n,source:n.source,stage:"vertex",modules:e});return{source:t,getUniforms:Yf(e),bindingAssignments:r,bindingTable:Kf(t,r),shaderLayout:_f(t,{vertexEntryPoint:n.vertexEntryPoint,scanVertexAttributes:n.scanVertexAttributes})}}function v0(n){const{vs:e,fs:t}=n,r=Xr(n.modules||[]);return{vs:Jc(n.platformInfo,{...n,source:e,stage:"vertex",modules:r}),fs:Jc(n.platformInfo,{...n,source:t,stage:"fragment",modules:r}),getUniforms:Yf(r)}}function x0(n,e){const{source:t,stage:r,modules:i,defines:s={},hookFunctions:o=[],inject:a={},pluginInjections:c={},pluginVertexInputs:l={},pluginVaryings:u={},vertexEntryPoint:d="vertexMain",fragmentEntryPoint:h="fragmentMain",log:m}=e;Zt(typeof t=="string","shader source must be a string");const p=Dn(t,{defines:s}),g=Xy(p,d,l),b=r0(g.source,d,h,u),_=b.source;let y="";const v=Xf(o),w={},x={},T={};Qf(c,w,x,T);for(const B in a){const P=typeof a[B]=="string"?{injection:a[B],order:0}:a[B],R=/^(v|f)s:(#)?([\w-]+)$/.exec(B);if(R){const H=R[2],re=R[3];H?re==="decl"?x[B]=[P]:T[B]=[P]:w[B]=[P]}else T[B]=[P]}S0(g.declarations,g.initialization,x,T),w0(b,x,T);const A=i,M=M0(_),L=I0(M.source),C=B0(A,e._bindingRegistry,L,s),I=[];for(const B of A){m&&Tf(B,_,m);const P=Dn(Zf(B,"wgsl",m),{defines:s}),R=L0(P,B,{usedBindingsByGroup:L,bindingRegistry:e._bindingRegistry,reservedBindingKeysByGroup:C});I.push(...R.bindingAssignments);const H=R.source;y+=H;const re=T0(B);for(const te in re){const St=/^(v|f)s:#([\w-]+)$/.exec(te);if(St){const wt=St[2]==="decl"?x:T;wt[te]=wt[te]||[],wt[te].push(re[te])}else w[te]=w[te]||[],w[te].push(re[te])}}return y+=Ia,y=Hr(y,r,E0(x),!1,"wgsl",{vertex:d,fragment:h}),y+=A0(v,w),y+=k0(I),y+=M.source,y=Hr(y,r,T,!1,"wgsl",{vertex:d,fragment:h}),D0(y),{source:y,bindingAssignments:I}}function Jc(n,e){var C;const{source:t,stage:r,language:i="glsl",modules:s,defines:o={},hookFunctions:a=[],inject:c={},pluginInjections:l={},pluginVertexInputs:u={},pluginVaryings:d={},prologue:h=!0,log:m}=e;Zt(typeof t=="string","shader source must be a string");const p=i==="glsl"?Py(t).version:-1,g=n.shaderLanguageVersion,b=p===100?"#version 100":"#version 300 es",y=t.split(`
`).slice(1).join(`
`),v={};s.forEach(I=>{Object.assign(v,I.defines)}),Object.assign(v,o);let w="";switch(i){case"wgsl":break;case"glsl":w=h?`${b}

// ----- PROLOGUE -------------------------
${`#define SHADER_TYPE_${r.toUpperCase()}`}

${Iy(n)}
${r==="fragment"?_0:""}

// ----- APPLICATION DEFINES -------------------------

${R0(v)}

`:`${b}
`;break}const x=Xf(a),T={},A={},M={};Qf(l,T,A,M);for(const I in c){const B=typeof c[I]=="string"?{injection:c[I],order:0}:c[I],P=/^(v|f)s:(#)?([\w-]+)$/.exec(I);if(P){const R=P[2],H=P[3];R?H==="decl"?A[I]=[B]:M[I]=[B]:T[I]=[B]}else M[I]=[B]}if(r==="vertex"){const I=jy(y,u);I&&(A["vs:#decl"]=A["vs:#decl"]||[],A["vs:#decl"].push({injection:I,order:Number.MIN_SAFE_INTEGER}))}const L=n0(y,r,d);if(L.declarations){const I=r==="vertex"?"vs:#decl":"fs:#decl";A[I]=A[I]||[],A[I].push({injection:L.declarations,order:Number.MIN_SAFE_INTEGER})}L.initialization&&(M["vs:#main-start"]=M["vs:#main-start"]||[],M["vs:#main-start"].push({injection:L.initialization,order:Number.MIN_SAFE_INTEGER}));for(const I of s){m&&Tf(I,y,m);const B=Zf(I,r,m);w+=B;const P=((C=I.instance)==null?void 0:C.normalizedInjections[r])||{};for(const R in P){const H=/^(v|f)s:#([\w-]+)$/.exec(R);if(H){const te=H[2]==="decl"?A:M;te[R]=te[R]||[],te[R].push(P[R])}else T[R]=T[R]||[],T[R].push(P[R])}}return w+="// ----- MAIN SHADER SOURCE -------------------------",w+=Ia,w=Hr(w,r,A),w+=Ao(x[r],T),w+=y,w=Hr(w,r,M),i==="glsl"&&p!==g&&(w=My(w,r)),i==="glsl"&&yy(w,r,m),w.trim()}function Yf(n){return function(t){var i;const r={};for(const s of n){const o=(i=s.getUniforms)==null?void 0:i.call(s,t,r);Object.assign(r,o)}return r}}function Qf(n,e,t,r){for(const i in n){const s=/^(v|f)s:(#)?([\w-]+)$/.exec(i);if(s){const o=s[2],a=s[3],c=o?a==="decl"?t:r:e;c[i]=c[i]||[],c[i].push(...n[i])}else r[i]=r[i]||[],r[i].push(...n[i])}}function S0(n,e,t,r){n&&(t["vs:#decl"]=t["vs:#decl"]||[],t["vs:#decl"].push({injection:n,order:Number.MIN_SAFE_INTEGER})),e&&(r["vs:#main-start"]=r["vs:#main-start"]||[],r["vs:#main-start"].push({injection:e,order:Number.MIN_SAFE_INTEGER}))}function w0(n,e,t){n.declarations&&(e["vs:#decl"]=e["vs:#decl"]||[],e["vs:#decl"].push({injection:n.declarations,order:Number.MIN_SAFE_INTEGER})),n.vertexInitialization&&(t["vs:#main-start"]=t["vs:#main-start"]||[],t["vs:#main-start"].push({injection:n.vertexInitialization,order:Number.MIN_SAFE_INTEGER})),n.fragmentInitialization&&(t["fs:#main-start"]=t["fs:#main-start"]||[],t["fs:#main-start"].push({injection:n.fragmentInitialization,order:Number.MIN_SAFE_INTEGER}))}function T0(n){var e,t;return{...((e=n.instance)==null?void 0:e.normalizedInjections.vertex)||{},...((t=n.instance)==null?void 0:t.normalizedInjections.fragment)||{}}}function E0(n){const e=[...n["vs:#decl"]||[],...n["fs:#decl"]||[]];return e.length?{"vs:#decl":e}:{}}function A0(n,e){return Ao(n.vertex,e,"wgsl")+Ao(n.fragment,e,"wgsl")}function R0(n={}){let e="";for(const t in n){const r=n[t];(r||Number.isFinite(r))&&(e+=`#define ${t.toUpperCase()} ${n[t]}
`)}return e}function Zf(n,e,t){let r;switch(e){case"vertex":r=n.vs||"";break;case"fragment":r=n.fs||"";break;case"wgsl":r=n.source||"";break;default:Zt(!1)}if(!n.name)throw new Error("Shader module must have a name");_y(n,e,{log:t});const i=n.name.toUpperCase().replace(/[^0-9a-z]/gi,"_");let s=`// ----- MODULE ${n.name} ---------------

`;return e!=="wgsl"&&(s+=`#define MODULE_${i}
`),s+=`${r}
`,s}function I0(n){const e=new Map;for(const t of Qt(n,zg)){const r=Number(t.bindingToken),i=Number(t.groupToken);Ma(i,r,t.name),Gt(e,i,r,`application binding "${t.name}"`)}return e}function M0(n){const e=Qt(n,ao),t=new Map;for(const s of e){if(s.bindingToken==="auto")continue;const o=Number(s.bindingToken),a=Number(s.groupToken);Ma(a,o,s.name),Gt(t,a,o,`application binding "${s.name}"`)}const r={sawSupportedBindingDeclaration:e.length>0},i=gf(n,ao,s=>P0(s,t,r));if(bf(n)&&!r.sawSupportedBindingDeclaration)throw new Error('Unsupported @binding(auto) declaration form in application WGSL. Use adjacent "@group(N)" and "@binding(auto)" decorators followed by a bindable "var" declaration.');return{source:i}}function L0(n,e,t){const r=[],s={sawSupportedBindingDeclaration:Qt(n,On).length>0,nextHintedBindingLocation:typeof e.firstBindingSlot=="number"?e.firstBindingSlot:null},o=gf(n,On,a=>C0(a,{module:e,context:t,bindingAssignments:r,relocationState:s}));if(bf(n)&&!s.sawSupportedBindingDeclaration)throw new Error(`Unsupported @binding(auto) declaration form in module "${e.name}". Use adjacent "@group(N)" and "@binding(auto)" decorators followed by a bindable "var" declaration.`);return{source:o,bindingAssignments:r}}function C0(n,e){var h,m;const{module:t,context:r,bindingAssignments:i,relocationState:s}=e,{match:o,bindingToken:a,groupToken:c,name:l}=n,u=Number(c);if(a==="auto"){const p=Jf(u,t.name,l),g=(h=r.bindingRegistry)==null?void 0:h.get(p),b=g!==void 0?g:F0(u,r.usedBindingsByGroup,t.name,s.nextHintedBindingLocation??void 0,r.bindingRegistry);return el(t.name,u,b,l),g!==void 0&&N0(r.reservedBindingKeysByGroup,u,b,p)?(i.push({moduleName:t.name,name:l,group:u,location:b}),o.replace(/@binding\(\s*auto\s*\)/,`@binding(${b})`)):(Gt(r.usedBindingsByGroup,u,b,`module "${t.name}" binding "${l}"`),(m=r.bindingRegistry)==null||m.set(p,b),i.push({moduleName:t.name,name:l,group:u,location:b}),s.nextHintedBindingLocation!==null&&g===void 0&&(s.nextHintedBindingLocation=b+1),o.replace(/@binding\(\s*auto\s*\)/,`@binding(${b})`))}const d=Number(a);return el(t.name,u,d,l),Gt(r.usedBindingsByGroup,u,d,`module "${t.name}" binding "${l}"`),i.push({moduleName:t.name,name:l,group:u,location:d}),o}function P0(n,e,t){const{match:r,bindingToken:i,groupToken:s,name:o}=n,a=Number(s);if(i==="auto"){const c=U0(a,e);return Ma(a,c,o),Gt(e,a,c,`application binding "${o}"`),r.replace(/@binding\(\s*auto\s*\)/,`@binding(${c})`)}return t.sawSupportedBindingDeclaration=!0,r}function B0(n,e,t,r){const i=new Map;if(!e)return i;for(const s of n)for(const o of O0(s,r)){const a=Jf(o.group,s.name,o.name),c=e.get(a);if(c!==void 0){const l=i.get(o.group)||new Map,u=l.get(c);if(u&&u!==a)throw new Error(`Duplicate WGSL binding reservation for modules "${u}" and "${a}": group ${o.group}, binding ${c}.`);Gt(t,o.group,c,`registered module binding "${a}"`),l.set(c,a),i.set(o.group,l)}}return i}function N0(n,e,t,r){const i=n.get(e);if(!i)return!1;const s=i.get(t);if(!s)return!1;if(s!==r)throw new Error(`Registered module binding "${r}" collided with "${s}": group ${e}, binding ${t}.`);return!0}function O0(n,e){const t=[],r=Dn(n.source||"",{defines:e});for(const i of Qt(r,On))t.push({name:i.name,group:Number(i.groupToken)});return t}function Ma(n,e,t){if(n===0&&e>=kn)throw new Error(`Application binding "${t}" in group 0 uses reserved binding ${e}. Application-owned explicit group-0 bindings must stay below ${kn}.`)}function el(n,e,t,r){if(e===0&&t<kn)throw new Error(`Module "${n}" binding "${r}" in group 0 uses reserved application binding ${t}. Module-owned explicit group-0 bindings must be ${kn} or higher.`)}function Gt(n,e,t,r){const i=n.get(e)||new Set;if(i.has(t))throw new Error(`Duplicate WGSL binding assignment for ${r}: group ${e}, binding ${t}.`);i.add(t),n.set(e,i)}function F0(n,e,t,r,i){const s=e.get(n)||new Set,o=new Set,a=`${n}:`,c=`${a}${t}:`;for(const[u,d]of i||[])u.startsWith(c)&&o.add(d);let l=r??(n===0?kn:s.size>0?Math.max(...s)+1:0);for(;s.has(l)||o.has(l);)l++;for(const[u,d]of i||[])d===l&&u.startsWith(a)&&(i==null||i.delete(u));return l}function U0(n,e){const t=e.get(n)||new Set;let r=0;for(;t.has(r);)r++;return r}function D0(n){const e=Hg(n,On);if(!e)return;const t=$0(n,e.index);throw t?new Error(`Unresolved @binding(auto) for module "${t}" binding "${e.name}" remained in assembled WGSL source.`):V0(n,e.index)?new Error(`Unresolved @binding(auto) for application binding "${e.name}" remained in assembled WGSL source.`):new Error(`Unresolved @binding(auto) remained in assembled WGSL source near "${G0(e.match)}".`)}function k0(n){if(n.length===0)return"";let e=`// ----- MODULE WGSL BINDING ASSIGNMENTS ---------------
`;for(const t of n)e+=`// ${t.moduleName}.${t.name} -> @group(${t.group}) @binding(${t.location})
`;return e+=`
`,e}function Jf(n,e,t){return`${n}:${e}:${t}`}function $0(n,e){const t=/^\/\/ ----- MODULE ([^\n]+) ---------------$/gm;let r,i;for(i=t.exec(n);i&&i.index<=e;)r=i[1],i=t.exec(n);return r}function V0(n,e){const t=n.indexOf(Ia);return t>=0?e>t:!0}function G0(n){return n.replace(/\s+/g," ").trim()}const $e=class $e{constructor(){f(this,"_hookFunctions",[]);f(this,"_defaultModules",[])}static getDefaultShaderAssembler(e){return Zt(e==="glsl"||e==="wgsl"),e==="wgsl"?($e.defaultShaderAssemblers.wgsl=$e.defaultShaderAssemblers.wgsl||new zt,$e.defaultShaderAssemblers.wgsl):($e.defaultShaderAssemblers.glsl=$e.defaultShaderAssemblers.glsl||new ed,$e.defaultShaderAssemblers.glsl)}addDefaultModule(e){this._defaultModules.find(t=>t.name===(typeof e=="string"?e:e.name))||this._defaultModules.push(e)}removeDefaultModule(e){const t=typeof e=="string"?e:e.name;this._defaultModules=this._defaultModules.filter(r=>r.name!==t)}addShaderHook(e,t){t&&(e=Object.assign(t,{hook:e})),this._hookFunctions.push(e)}_getModuleList(e=[]){const t=new Array(this._defaultModules.length+e.length),r={};let i=0;for(let s=0,o=this._defaultModules.length;s<o;++s){const a=this._defaultModules[s],c=a.name;t[i++]=a,r[c]=!0}for(let s=0,o=e.length;s<o;++s){const a=e[s],c=a.name;r[c]||(t[i++]=a,r[c]=!0)}return t.length=i,jr(t),t}};f($e,"defaultShaderAssemblers",{});let mt=$e;class ed extends mt{constructor(){super(...arguments);f(this,"shaderLanguage","glsl")}assembleGLSLShaderPair(t){const r=this._getModuleList(t.modules),i=this._hookFunctions;return{...v0({...t,vs:t.vs,fs:t.fs,modules:r,hookFunctions:i}),modules:r}}}class zt extends mt{constructor(){super(...arguments);f(this,"shaderLanguage","wgsl");f(this,"_wgslBindingRegistry",new Map)}assembleWGSLShader(t){const r=this._getModuleList(t.modules),i=this._hookFunctions,s=zt.getShaderPreprocessorDefines(t,r),o=t.platformInfo.shaderLanguage==="wgsl"&&t.source?Dn(t.source,{defines:s}):t.source,{source:a,getUniforms:c,bindingAssignments:l}=y0({...t,source:o,defines:s,_bindingRegistry:this._wgslBindingRegistry,modules:r,hookFunctions:i}),u=t.platformInfo.shaderLanguage==="wgsl"?Dn(a,{defines:s}):a;return{source:u,getUniforms:c,modules:r,bindingAssignments:l,bindingTable:Kf(u,l),shaderLayout:_f(u,{vertexEntryPoint:t.vertexEntryPoint,scanVertexAttributes:t.scanVertexAttributes})}}static getShaderPreprocessorDefines(t,r){return{...zt.getPlatformPreprocessorDefines(t.platformInfo),...r.reduce((i,s)=>(Object.assign(i,s.defines),i),{}),...t.defines}}static getPlatformPreprocessorDefines(t){const r=t.limits||{};return{LUMA_SUPPORTS_VERTEX_STORAGE_BUFFERS:t.type==="webgpu"&&(r.maxStorageBuffersInVertexStage||0)>0,LUMA_FP32_TAN_PRECISION_WORKAROUND:t.type==="webgpu"&&t.gpu.toLowerCase()!=="nvidia"&&t.gpu.toLowerCase()!=="amd",LUMA_FP64_INTEGER_ARITHMETIC:t.type==="webgpu"&&t.gpu.toLowerCase()==="apple"}}}const z0=`out vec4 transform_output;
void main() {
  transform_output = vec4(0);
}`,W0=`#version 300 es
${z0}`;function H0(n){const{input:e,inputChannels:t,output:r}={};if(!e)return W0;if(!t)throw new Error("inputChannels");const i=j0(t),s=X0(e,t);return`#version 300 es
in ${i} ${e};
out vec4 ${r};
void main() {
  ${r} = ${s};
}`}function j0(n){switch(n){case 1:return"float";case 2:return"vec2";case 3:return"vec3";case 4:return"vec4";default:throw new Error(`invalid channels: ${n}`)}}function X0(n,e){switch(e){case 1:return`vec4(${n}, 0.0, 0.0, 1.0)`;case 2:return`vec4(${n}, 0.0, 1.0)`;case 3:return`vec4(${n}, 1.0)`;case 4:return n;default:throw new Error(`invalid channels: ${e}`)}}const K0={EPSILON:1e-12,debug:!1,precision:4,printTypes:!1,printDegrees:!1,printRowMajor:!0,_cartographicRadians:!1};globalThis.mathgl=globalThis.mathgl||{config:{...K0}};const fe=globalThis.mathgl.config;function q0(n,{precision:e=fe.precision}={}){return n=Q0(n),`${parseFloat(n.toPrecision(e))}`}function pt(n){return Array.isArray(n)||ArrayBuffer.isView(n)&&!(n instanceof DataView)}function YC(n,e,t){return J0(n,r=>Math.max(e,Math.min(t,r)))}function Y0(n,e,t){return pt(n)?n.map((r,i)=>Y0(r,e[i],t)):t*e+(1-t)*n}function td(n,e,t){const r=fe.EPSILON;try{if(n===e)return!0;if(pt(n)&&pt(e)){if(n.length!==e.length)return!1;for(let i=0;i<n.length;++i)if(!td(n[i],e[i]))return!1;return!0}return n&&n.equals?n.equals(e):e&&e.equals?e.equals(n):typeof n=="number"&&typeof e=="number"?Math.abs(n-e)<=fe.EPSILON*Math.max(1,Math.abs(n),Math.abs(e)):!1}finally{fe.EPSILON=r}}function Q0(n){return Math.round(n/fe.EPSILON)*fe.EPSILON}function Z0(n){return n.clone?n.clone():new Array(n.length)}function J0(n,e,t){if(pt(n)){const r=n;t=t||Z0(r);for(let i=0;i<t.length&&i<r.length;++i){const s=typeof n=="number"?n:n[i];t[i]=e(s,i,t)}return t}return e(n)}class La extends Array{clone(){return new this.constructor().copy(this)}fromArray(e,t=0){for(let r=0;r<this.ELEMENTS;++r)this[r]=e[r+t];return this.check()}toArray(e=[],t=0){for(let r=0;r<this.ELEMENTS;++r)e[t+r]=this[r];return e}toObject(e){return e}from(e){return Array.isArray(e)?this.copy(e):this.fromObject(e)}to(e){return e===this?this:pt(e)?this.toArray(e):this.toObject(e)}toTarget(e){return e?this.to(e):this}toFloat32Array(){return new Float32Array(this)}toString(){return this.formatString(fe)}formatString(e){let t="";for(let r=0;r<this.ELEMENTS;++r)t+=(r>0?", ":"")+q0(this[r],e);return`${e.printTypes?this.constructor.name:""}[${t}]`}equals(e){if(!e||this.length!==e.length)return!1;for(let t=0;t<this.ELEMENTS;++t)if(!td(this[t],e[t]))return!1;return!0}exactEquals(e){if(!e||this.length!==e.length)return!1;for(let t=0;t<this.ELEMENTS;++t)if(this[t]!==e[t])return!1;return!0}negate(){for(let e=0;e<this.ELEMENTS;++e)this[e]=-this[e];return this.check()}lerp(e,t,r){if(r===void 0)return this.lerp(this,e,t);for(let i=0;i<this.ELEMENTS;++i){const s=e[i],o=typeof t=="number"?t:t[i];this[i]=s+r*(o-s)}return this.check()}min(e){for(let t=0;t<this.ELEMENTS;++t)this[t]=Math.min(e[t],this[t]);return this.check()}max(e){for(let t=0;t<this.ELEMENTS;++t)this[t]=Math.max(e[t],this[t]);return this.check()}clamp(e,t){for(let r=0;r<this.ELEMENTS;++r)this[r]=Math.min(Math.max(this[r],e[r]),t[r]);return this.check()}add(...e){for(const t of e)for(let r=0;r<this.ELEMENTS;++r)this[r]+=t[r];return this.check()}subtract(...e){for(const t of e)for(let r=0;r<this.ELEMENTS;++r)this[r]-=t[r];return this.check()}scale(e){if(typeof e=="number")for(let t=0;t<this.ELEMENTS;++t)this[t]*=e;else for(let t=0;t<this.ELEMENTS&&t<e.length;++t)this[t]*=e[t];return this.check()}multiplyByScalar(e){for(let t=0;t<this.ELEMENTS;++t)this[t]*=e;return this.check()}check(){if(fe.debug&&!this.validate())throw new Error(`math.gl: ${this.constructor.name} some fields set to invalid numbers'`);return this}validate(){let e=this.length===this.ELEMENTS;for(let t=0;t<this.ELEMENTS;++t)e=e&&Number.isFinite(this[t]);return e}sub(e){return this.subtract(e)}setScalar(e){for(let t=0;t<this.ELEMENTS;++t)this[t]=e;return this.check()}addScalar(e){for(let t=0;t<this.ELEMENTS;++t)this[t]+=e;return this.check()}subScalar(e){return this.addScalar(-e)}multiplyScalar(e){for(let t=0;t<this.ELEMENTS;++t)this[t]*=e;return this.check()}divideScalar(e){return this.multiplyByScalar(1/e)}clampScalar(e,t){for(let r=0;r<this.ELEMENTS;++r)this[r]=Math.min(Math.max(this[r],e),t);return this.check()}get elements(){return this}}function ev(n,e){if(n.length!==e)return!1;for(let t=0;t<n.length;++t)if(!Number.isFinite(n[t]))return!1;return!0}function z(n){if(!Number.isFinite(n))throw new Error(`Invalid number ${JSON.stringify(n)}`);return n}function yn(n,e,t=""){if(fe.debug&&!ev(n,e))throw new Error(`math.gl: ${t} some fields set to invalid numbers'`);return n}function tl(n,e){if(!n)throw new Error(`math.gl assertion ${e}`)}class nd extends La{get x(){return this[0]}set x(e){this[0]=z(e)}get y(){return this[1]}set y(e){this[1]=z(e)}len(){return Math.sqrt(this.lengthSquared())}magnitude(){return this.len()}lengthSquared(){let e=0;for(let t=0;t<this.ELEMENTS;++t)e+=this[t]*this[t];return e}magnitudeSquared(){return this.lengthSquared()}distance(e){return Math.sqrt(this.distanceSquared(e))}distanceSquared(e){let t=0;for(let r=0;r<this.ELEMENTS;++r){const i=this[r]-e[r];t+=i*i}return z(t)}dot(e){let t=0;for(let r=0;r<this.ELEMENTS;++r)t+=this[r]*e[r];return z(t)}normalize(){const e=this.magnitude();if(e!==0)for(let t=0;t<this.ELEMENTS;++t)this[t]/=e;return this.check()}multiply(...e){for(const t of e)for(let r=0;r<this.ELEMENTS;++r)this[r]*=t[r];return this.check()}divide(...e){for(const t of e)for(let r=0;r<this.ELEMENTS;++r)this[r]/=t[r];return this.check()}lengthSq(){return this.lengthSquared()}distanceTo(e){return this.distance(e)}distanceToSquared(e){return this.distanceSquared(e)}getComponent(e){return tl(e>=0&&e<this.ELEMENTS,"index is out of range"),z(this[e])}setComponent(e,t){return tl(e>=0&&e<this.ELEMENTS,"index is out of range"),this[e]=t,this.check()}addVectors(e,t){return this.copy(e).add(t)}subVectors(e,t){return this.copy(e).subtract(t)}multiplyVectors(e,t){return this.copy(e).multiply(t)}addScaledVector(e,t){return this.add(new this.constructor(e).multiplyScalar(t))}}const vn=1e-6;let Me=typeof Float32Array<"u"?Float32Array:Array;function tv(){const n=new Me(2);return Me!=Float32Array&&(n[0]=0,n[1]=0),n}function QC(n,e,t){return n[0]=e[0]+t[0],n[1]=e[1]+t[1],n}function nv(n,e,t){return n[0]=e[0]-t[0],n[1]=e[1]-t[1],n}function ZC(n,e){return n[0]=-e[0],n[1]=-e[1],n}function rd(n,e,t,r){const i=e[0],s=e[1];return n[0]=i+r*(t[0]-i),n[1]=s+r*(t[1]-s),n}function rv(n,e,t){const r=e[0],i=e[1];return n[0]=t[0]*r+t[3]*i+t[6],n[1]=t[1]*r+t[4]*i+t[7],n}function iv(n,e,t){const r=e[0],i=e[1];return n[0]=t[0]*r+t[4]*i+t[12],n[1]=t[1]*r+t[5]*i+t[13],n}const JC=nv;(function(){const n=tv();return function(e,t,r,i,s,o){let a,c;for(t||(t=2),r||(r=0),i?c=Math.min(i*t+r,e.length):c=e.length,a=r;a<c;a+=t)n[0]=e[a],n[1]=e[a+1],s(n,n,o),e[a]=n[0],e[a+1]=n[1];return e}})();function sv(n,e,t){const r=e[0],i=e[1],s=t[3]*r+t[7]*i||1;return n[0]=(t[0]*r+t[4]*i)/s,n[1]=(t[1]*r+t[5]*i)/s,n}function id(n,e,t){const r=e[0],i=e[1],s=e[2],o=t[3]*r+t[7]*i+t[11]*s||1;return n[0]=(t[0]*r+t[4]*i+t[8]*s)/o,n[1]=(t[1]*r+t[5]*i+t[9]*s)/o,n[2]=(t[2]*r+t[6]*i+t[10]*s)/o,n}function ov(n,e,t){const r=e[0],i=e[1];return n[0]=t[0]*r+t[2]*i,n[1]=t[1]*r+t[3]*i,n[2]=e[2],n}function av(n,e,t){const r=e[0],i=e[1];return n[0]=t[0]*r+t[2]*i,n[1]=t[1]*r+t[3]*i,n[2]=e[2],n[3]=e[3],n}function sd(n,e,t){const r=e[0],i=e[1],s=e[2];return n[0]=t[0]*r+t[3]*i+t[6]*s,n[1]=t[1]*r+t[4]*i+t[7]*s,n[2]=t[2]*r+t[5]*i+t[8]*s,n[3]=e[3],n}function od(){const n=new Me(3);return Me!=Float32Array&&(n[0]=0,n[1]=0,n[2]=0),n}function cv(n){const e=n[0],t=n[1],r=n[2];return Math.sqrt(e*e+t*t+r*r)}function nl(n,e,t){const r=new Me(3);return r[0]=n,r[1]=e,r[2]=t,r}function lv(n,e,t){return n[0]=e[0]-t[0],n[1]=e[1]-t[1],n[2]=e[2]-t[2],n}function uv(n){const e=n[0],t=n[1],r=n[2];return e*e+t*t+r*r}function fv(n,e){return n[0]=-e[0],n[1]=-e[1],n[2]=-e[2],n}function dv(n,e){const t=e[0],r=e[1],i=e[2];let s=t*t+r*r+i*i;return s>0&&(s=1/Math.sqrt(s)),n[0]=e[0]*s,n[1]=e[1]*s,n[2]=e[2]*s,n}function ad(n,e){return n[0]*e[0]+n[1]*e[1]+n[2]*e[2]}function Fr(n,e,t){const r=e[0],i=e[1],s=e[2],o=t[0],a=t[1],c=t[2];return n[0]=i*c-s*a,n[1]=s*o-r*c,n[2]=r*a-i*o,n}function eP(n,e,t,r){const i=e[0],s=e[1],o=e[2];return n[0]=i+r*(t[0]-i),n[1]=s+r*(t[1]-s),n[2]=o+r*(t[2]-o),n}function Ca(n,e,t){const r=e[0],i=e[1],s=e[2];let o=t[3]*r+t[7]*i+t[11]*s+t[15];return o=o||1,n[0]=(t[0]*r+t[4]*i+t[8]*s+t[12])/o,n[1]=(t[1]*r+t[5]*i+t[9]*s+t[13])/o,n[2]=(t[2]*r+t[6]*i+t[10]*s+t[14])/o,n}function cd(n,e,t){const r=e[0],i=e[1],s=e[2];return n[0]=r*t[0]+i*t[3]+s*t[6],n[1]=r*t[1]+i*t[4]+s*t[7],n[2]=r*t[2]+i*t[5]+s*t[8],n}function ld(n,e,t){const r=t[0],i=t[1],s=t[2],o=t[3],a=e[0],c=e[1],l=e[2];let u=i*l-s*c,d=s*a-r*l,h=r*c-i*a,m=i*h-s*d,p=s*u-r*h,g=r*d-i*u;const b=o*2;return u*=b,d*=b,h*=b,m*=2,p*=2,g*=2,n[0]=a+u+m,n[1]=c+d+p,n[2]=l+h+g,n}function hv(n,e,t,r){const i=[],s=[];return i[0]=e[0]-t[0],i[1]=e[1]-t[1],i[2]=e[2]-t[2],s[0]=i[0],s[1]=i[1]*Math.cos(r)-i[2]*Math.sin(r),s[2]=i[1]*Math.sin(r)+i[2]*Math.cos(r),n[0]=s[0]+t[0],n[1]=s[1]+t[1],n[2]=s[2]+t[2],n}function mv(n,e,t,r){const i=[],s=[];return i[0]=e[0]-t[0],i[1]=e[1]-t[1],i[2]=e[2]-t[2],s[0]=i[2]*Math.sin(r)+i[0]*Math.cos(r),s[1]=i[1],s[2]=i[2]*Math.cos(r)-i[0]*Math.sin(r),n[0]=s[0]+t[0],n[1]=s[1]+t[1],n[2]=s[2]+t[2],n}function pv(n,e,t,r){const i=[],s=[];return i[0]=e[0]-t[0],i[1]=e[1]-t[1],i[2]=e[2]-t[2],s[0]=i[0]*Math.cos(r)-i[1]*Math.sin(r),s[1]=i[0]*Math.sin(r)+i[1]*Math.cos(r),s[2]=i[2],n[0]=s[0]+t[0],n[1]=s[1]+t[1],n[2]=s[2]+t[2],n}function gv(n,e){const t=n[0],r=n[1],i=n[2],s=e[0],o=e[1],a=e[2],c=Math.sqrt((t*t+r*r+i*i)*(s*s+o*o+a*a)),l=c&&ad(n,e)/c;return Math.acos(Math.min(Math.max(l,-1),1))}const tP=lv,bv=cv,nP=uv;(function(){const n=od();return function(e,t,r,i,s,o){let a,c;for(t||(t=3),r||(r=0),i?c=Math.min(i*t+r,e.length):c=e.length,a=r;a<c;a+=t)n[0]=e[a],n[1]=e[a+1],n[2]=e[a+2],s(n,n,o),e[a]=n[0],e[a+1]=n[1],e[a+2]=n[2];return e}})();const ps=[0,0,0];let gr;class Ge extends nd{static get ZERO(){return gr||(gr=new Ge(0,0,0),Object.freeze(gr)),gr}constructor(e=0,t=0,r=0){super(-0,-0,-0),arguments.length===1&&pt(e)?this.copy(e):(fe.debug&&(z(e),z(t),z(r)),this[0]=e,this[1]=t,this[2]=r)}set(e,t,r){return this[0]=e,this[1]=t,this[2]=r,this.check()}copy(e){return this[0]=e[0],this[1]=e[1],this[2]=e[2],this.check()}fromObject(e){return fe.debug&&(z(e.x),z(e.y),z(e.z)),this[0]=e.x,this[1]=e.y,this[2]=e.z,this.check()}toObject(e){return e.x=this[0],e.y=this[1],e.z=this[2],e}get ELEMENTS(){return 3}get z(){return this[2]}set z(e){this[2]=z(e)}angle(e){return gv(this,e)}cross(e){return Fr(this,this,e),this.check()}rotateX({radians:e,origin:t=ps}){return hv(this,this,t,e),this.check()}rotateY({radians:e,origin:t=ps}){return mv(this,this,t,e),this.check()}rotateZ({radians:e,origin:t=ps}){return pv(this,this,t,e),this.check()}transform(e){return this.transformAsPoint(e)}transformAsPoint(e){return Ca(this,this,e),this.check()}transformAsVector(e){return id(this,this,e),this.check()}transformByMatrix3(e){return cd(this,this,e),this.check()}transformByMatrix2(e){return ov(this,this,e),this.check()}transformByQuaternion(e){return ld(this,this,e),this.check()}}let br;class Pa extends nd{static get ZERO(){return br||(br=new Pa(0,0,0,0),Object.freeze(br)),br}constructor(e=0,t=0,r=0,i=0){super(-0,-0,-0,-0),pt(e)&&arguments.length===1?this.copy(e):(fe.debug&&(z(e),z(t),z(r),z(i)),this[0]=e,this[1]=t,this[2]=r,this[3]=i)}set(e,t,r,i){return this[0]=e,this[1]=t,this[2]=r,this[3]=i,this.check()}copy(e){return this[0]=e[0],this[1]=e[1],this[2]=e[2],this[3]=e[3],this.check()}fromObject(e){return fe.debug&&(z(e.x),z(e.y),z(e.z),z(e.w)),this[0]=e.x,this[1]=e.y,this[2]=e.z,this[3]=e.w,this}toObject(e){return e.x=this[0],e.y=this[1],e.z=this[2],e.w=this[3],e}get ELEMENTS(){return 4}get z(){return this[2]}set z(e){this[2]=z(e)}get w(){return this[3]}set w(e){this[3]=z(e)}transform(e){return Ca(this,this,e),this.check()}transformByMatrix3(e){return sd(this,this,e),this.check()}transformByMatrix2(e){return av(this,this,e),this.check()}transformByQuaternion(e){return ld(this,this,e),this.check()}applyMatrix4(e){return e.transform(this,this),this}}class ud extends La{toString(){let e="[";if(fe.printRowMajor){e+="row-major:";for(let t=0;t<this.RANK;++t)for(let r=0;r<this.RANK;++r)e+=` ${this[r*this.RANK+t]}`}else{e+="column-major:";for(let t=0;t<this.ELEMENTS;++t)e+=` ${this[t]}`}return e+="]",e}getElementIndex(e,t){return t*this.RANK+e}getElement(e,t){return this[t*this.RANK+e]}setElement(e,t,r){return this[t*this.RANK+e]=z(r),this}getColumn(e,t=new Array(this.RANK).fill(-0)){const r=e*this.RANK;for(let i=0;i<this.RANK;++i)t[i]=this[r+i];return t}setColumn(e,t){const r=e*this.RANK;for(let i=0;i<this.RANK;++i)this[r+i]=t[i];return this}}function _v(){const n=new Me(9);return Me!=Float32Array&&(n[1]=0,n[2]=0,n[3]=0,n[5]=0,n[6]=0,n[7]=0),n[0]=1,n[4]=1,n[8]=1,n}function yv(n,e){if(n===e){const t=e[1],r=e[2],i=e[5];n[1]=e[3],n[2]=e[6],n[3]=t,n[5]=e[7],n[6]=r,n[7]=i}else n[0]=e[0],n[1]=e[3],n[2]=e[6],n[3]=e[1],n[4]=e[4],n[5]=e[7],n[6]=e[2],n[7]=e[5],n[8]=e[8];return n}function vv(n,e){const t=e[0],r=e[1],i=e[2],s=e[3],o=e[4],a=e[5],c=e[6],l=e[7],u=e[8],d=u*o-a*l,h=-u*s+a*c,m=l*s-o*c;let p=t*d+r*h+i*m;return p?(p=1/p,n[0]=d*p,n[1]=(-u*r+i*l)*p,n[2]=(a*r-i*o)*p,n[3]=h*p,n[4]=(u*t-i*c)*p,n[5]=(-a*t+i*s)*p,n[6]=m*p,n[7]=(-l*t+r*c)*p,n[8]=(o*t-r*s)*p,n):null}function xv(n){const e=n[0],t=n[1],r=n[2],i=n[3],s=n[4],o=n[5],a=n[6],c=n[7],l=n[8];return e*(l*s-o*c)+t*(-l*i+o*a)+r*(c*i-s*a)}function rl(n,e,t){const r=e[0],i=e[1],s=e[2],o=e[3],a=e[4],c=e[5],l=e[6],u=e[7],d=e[8],h=t[0],m=t[1],p=t[2],g=t[3],b=t[4],_=t[5],y=t[6],v=t[7],w=t[8];return n[0]=h*r+m*o+p*l,n[1]=h*i+m*a+p*u,n[2]=h*s+m*c+p*d,n[3]=g*r+b*o+_*l,n[4]=g*i+b*a+_*u,n[5]=g*s+b*c+_*d,n[6]=y*r+v*o+w*l,n[7]=y*i+v*a+w*u,n[8]=y*s+v*c+w*d,n}function Sv(n,e,t){const r=e[0],i=e[1],s=e[2],o=e[3],a=e[4],c=e[5],l=e[6],u=e[7],d=e[8],h=t[0],m=t[1];return n[0]=r,n[1]=i,n[2]=s,n[3]=o,n[4]=a,n[5]=c,n[6]=h*r+m*o+l,n[7]=h*i+m*a+u,n[8]=h*s+m*c+d,n}function wv(n,e,t){const r=e[0],i=e[1],s=e[2],o=e[3],a=e[4],c=e[5],l=e[6],u=e[7],d=e[8],h=Math.sin(t),m=Math.cos(t);return n[0]=m*r+h*o,n[1]=m*i+h*a,n[2]=m*s+h*c,n[3]=m*o-h*r,n[4]=m*a-h*i,n[5]=m*c-h*s,n[6]=l,n[7]=u,n[8]=d,n}function il(n,e,t){const r=t[0],i=t[1];return n[0]=r*e[0],n[1]=r*e[1],n[2]=r*e[2],n[3]=i*e[3],n[4]=i*e[4],n[5]=i*e[5],n[6]=e[6],n[7]=e[7],n[8]=e[8],n}function Tv(n,e){const t=e[0],r=e[1],i=e[2],s=e[3],o=t+t,a=r+r,c=i+i,l=t*o,u=r*o,d=r*a,h=i*o,m=i*a,p=i*c,g=s*o,b=s*a,_=s*c;return n[0]=1-d-p,n[3]=u-_,n[6]=h+b,n[1]=u+_,n[4]=1-l-p,n[7]=m-g,n[2]=h-b,n[5]=m+g,n[8]=1-l-d,n}var Ro;(function(n){n[n.COL0ROW0=0]="COL0ROW0",n[n.COL0ROW1=1]="COL0ROW1",n[n.COL0ROW2=2]="COL0ROW2",n[n.COL1ROW0=3]="COL1ROW0",n[n.COL1ROW1=4]="COL1ROW1",n[n.COL1ROW2=5]="COL1ROW2",n[n.COL2ROW0=6]="COL2ROW0",n[n.COL2ROW1=7]="COL2ROW1",n[n.COL2ROW2=8]="COL2ROW2"})(Ro||(Ro={}));const Ev=Object.freeze([1,0,0,0,1,0,0,0,1]);class Ie extends ud{static get IDENTITY(){return Rv()}static get ZERO(){return Av()}get ELEMENTS(){return 9}get RANK(){return 3}get INDICES(){return Ro}constructor(e,...t){super(-0,-0,-0,-0,-0,-0,-0,-0,-0),arguments.length===1&&Array.isArray(e)?this.copy(e):t.length>0?this.copy([e,...t]):this.identity()}copy(e){return this[0]=e[0],this[1]=e[1],this[2]=e[2],this[3]=e[3],this[4]=e[4],this[5]=e[5],this[6]=e[6],this[7]=e[7],this[8]=e[8],this.check()}identity(){return this.copy(Ev)}fromObject(e){return this.check()}fromQuaternion(e){return Tv(this,e),this.check()}set(e,t,r,i,s,o,a,c,l){return this[0]=e,this[1]=t,this[2]=r,this[3]=i,this[4]=s,this[5]=o,this[6]=a,this[7]=c,this[8]=l,this.check()}setRowMajor(e,t,r,i,s,o,a,c,l){return this[0]=e,this[1]=i,this[2]=a,this[3]=t,this[4]=s,this[5]=c,this[6]=r,this[7]=o,this[8]=l,this.check()}determinant(){return xv(this)}transpose(){return yv(this,this),this.check()}invert(){return vv(this,this),this.check()}multiplyLeft(e){return rl(this,e,this),this.check()}multiplyRight(e){return rl(this,this,e),this.check()}rotate(e){return wv(this,this,e),this.check()}scale(e){return Array.isArray(e)?il(this,this,e):il(this,this,[e,e]),this.check()}translate(e){return Sv(this,this,e),this.check()}transform(e,t){let r;switch(e.length){case 2:r=rv(t||[-0,-0],e,this);break;case 3:r=cd(t||[-0,-0,-0],e,this);break;case 4:r=sd(t||[-0,-0,-0,-0],e,this);break;default:throw new Error("Illegal vector")}return yn(r,e.length),r}transformVector(e,t){return this.transform(e,t)}transformVector2(e,t){return this.transform(e,t)}transformVector3(e,t){return this.transform(e,t)}}let _r,yr=null;function Av(){return _r||(_r=new Ie([0,0,0,0,0,0,0,0,0]),Object.freeze(_r)),_r}function Rv(){return yr||(yr=new Ie,Object.freeze(yr)),yr}function Iv(n){return n[0]=1,n[1]=0,n[2]=0,n[3]=0,n[4]=0,n[5]=1,n[6]=0,n[7]=0,n[8]=0,n[9]=0,n[10]=1,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,n}function Mv(n,e){if(n===e){const t=e[1],r=e[2],i=e[3],s=e[6],o=e[7],a=e[11];n[1]=e[4],n[2]=e[8],n[3]=e[12],n[4]=t,n[6]=e[9],n[7]=e[13],n[8]=r,n[9]=s,n[11]=e[14],n[12]=i,n[13]=o,n[14]=a}else n[0]=e[0],n[1]=e[4],n[2]=e[8],n[3]=e[12],n[4]=e[1],n[5]=e[5],n[6]=e[9],n[7]=e[13],n[8]=e[2],n[9]=e[6],n[10]=e[10],n[11]=e[14],n[12]=e[3],n[13]=e[7],n[14]=e[11],n[15]=e[15];return n}function Lv(n,e){const t=e[0],r=e[1],i=e[2],s=e[3],o=e[4],a=e[5],c=e[6],l=e[7],u=e[8],d=e[9],h=e[10],m=e[11],p=e[12],g=e[13],b=e[14],_=e[15],y=t*a-r*o,v=t*c-i*o,w=t*l-s*o,x=r*c-i*a,T=r*l-s*a,A=i*l-s*c,M=u*g-d*p,L=u*b-h*p,C=u*_-m*p,I=d*b-h*g,B=d*_-m*g,P=h*_-m*b;let R=y*P-v*B+w*I+x*C-T*L+A*M;return R?(R=1/R,n[0]=(a*P-c*B+l*I)*R,n[1]=(i*B-r*P-s*I)*R,n[2]=(g*A-b*T+_*x)*R,n[3]=(h*T-d*A-m*x)*R,n[4]=(c*C-o*P-l*L)*R,n[5]=(t*P-i*C+s*L)*R,n[6]=(b*w-p*A-_*v)*R,n[7]=(u*A-h*w+m*v)*R,n[8]=(o*B-a*C+l*M)*R,n[9]=(r*C-t*B-s*M)*R,n[10]=(p*T-g*w+_*y)*R,n[11]=(d*w-u*T-m*y)*R,n[12]=(a*L-o*I-c*M)*R,n[13]=(t*I-r*L+i*M)*R,n[14]=(g*v-p*x-b*y)*R,n[15]=(u*x-d*v+h*y)*R,n):null}function Cv(n){const e=n[0],t=n[1],r=n[2],i=n[3],s=n[4],o=n[5],a=n[6],c=n[7],l=n[8],u=n[9],d=n[10],h=n[11],m=n[12],p=n[13],g=n[14],b=n[15],_=e*o-t*s,y=e*a-r*s,v=t*a-r*o,w=l*p-u*m,x=l*g-d*m,T=u*g-d*p,A=e*T-t*x+r*w,M=s*T-o*x+a*w,L=l*v-u*y+d*_,C=m*v-p*y+g*_;return c*A-i*M+b*L-h*C}function sl(n,e,t){const r=e[0],i=e[1],s=e[2],o=e[3],a=e[4],c=e[5],l=e[6],u=e[7],d=e[8],h=e[9],m=e[10],p=e[11],g=e[12],b=e[13],_=e[14],y=e[15];let v=t[0],w=t[1],x=t[2],T=t[3];return n[0]=v*r+w*a+x*d+T*g,n[1]=v*i+w*c+x*h+T*b,n[2]=v*s+w*l+x*m+T*_,n[3]=v*o+w*u+x*p+T*y,v=t[4],w=t[5],x=t[6],T=t[7],n[4]=v*r+w*a+x*d+T*g,n[5]=v*i+w*c+x*h+T*b,n[6]=v*s+w*l+x*m+T*_,n[7]=v*o+w*u+x*p+T*y,v=t[8],w=t[9],x=t[10],T=t[11],n[8]=v*r+w*a+x*d+T*g,n[9]=v*i+w*c+x*h+T*b,n[10]=v*s+w*l+x*m+T*_,n[11]=v*o+w*u+x*p+T*y,v=t[12],w=t[13],x=t[14],T=t[15],n[12]=v*r+w*a+x*d+T*g,n[13]=v*i+w*c+x*h+T*b,n[14]=v*s+w*l+x*m+T*_,n[15]=v*o+w*u+x*p+T*y,n}function Io(n,e,t){const r=t[0],i=t[1],s=t[2];let o,a,c,l,u,d,h,m,p,g,b,_;return e===n?(n[12]=e[0]*r+e[4]*i+e[8]*s+e[12],n[13]=e[1]*r+e[5]*i+e[9]*s+e[13],n[14]=e[2]*r+e[6]*i+e[10]*s+e[14],n[15]=e[3]*r+e[7]*i+e[11]*s+e[15]):(o=e[0],a=e[1],c=e[2],l=e[3],u=e[4],d=e[5],h=e[6],m=e[7],p=e[8],g=e[9],b=e[10],_=e[11],n[0]=o,n[1]=a,n[2]=c,n[3]=l,n[4]=u,n[5]=d,n[6]=h,n[7]=m,n[8]=p,n[9]=g,n[10]=b,n[11]=_,n[12]=o*r+u*i+p*s+e[12],n[13]=a*r+d*i+g*s+e[13],n[14]=c*r+h*i+b*s+e[14],n[15]=l*r+m*i+_*s+e[15]),n}function fd(n,e,t){const r=t[0],i=t[1],s=t[2];return n[0]=e[0]*r,n[1]=e[1]*r,n[2]=e[2]*r,n[3]=e[3]*r,n[4]=e[4]*i,n[5]=e[5]*i,n[6]=e[6]*i,n[7]=e[7]*i,n[8]=e[8]*s,n[9]=e[9]*s,n[10]=e[10]*s,n[11]=e[11]*s,n[12]=e[12],n[13]=e[13],n[14]=e[14],n[15]=e[15],n}function Pv(n,e,t,r){let i=r[0],s=r[1],o=r[2],a=Math.sqrt(i*i+s*s+o*o),c,l,u,d,h,m,p,g,b,_,y,v,w,x,T,A,M,L,C,I,B,P,R,H;return a<vn?null:(a=1/a,i*=a,s*=a,o*=a,l=Math.sin(t),c=Math.cos(t),u=1-c,d=e[0],h=e[1],m=e[2],p=e[3],g=e[4],b=e[5],_=e[6],y=e[7],v=e[8],w=e[9],x=e[10],T=e[11],A=i*i*u+c,M=s*i*u+o*l,L=o*i*u-s*l,C=i*s*u-o*l,I=s*s*u+c,B=o*s*u+i*l,P=i*o*u+s*l,R=s*o*u-i*l,H=o*o*u+c,n[0]=d*A+g*M+v*L,n[1]=h*A+b*M+w*L,n[2]=m*A+_*M+x*L,n[3]=p*A+y*M+T*L,n[4]=d*C+g*I+v*B,n[5]=h*C+b*I+w*B,n[6]=m*C+_*I+x*B,n[7]=p*C+y*I+T*B,n[8]=d*P+g*R+v*H,n[9]=h*P+b*R+w*H,n[10]=m*P+_*R+x*H,n[11]=p*P+y*R+T*H,e!==n&&(n[12]=e[12],n[13]=e[13],n[14]=e[14],n[15]=e[15]),n)}function dd(n,e,t){const r=Math.sin(t),i=Math.cos(t),s=e[4],o=e[5],a=e[6],c=e[7],l=e[8],u=e[9],d=e[10],h=e[11];return e!==n&&(n[0]=e[0],n[1]=e[1],n[2]=e[2],n[3]=e[3],n[12]=e[12],n[13]=e[13],n[14]=e[14],n[15]=e[15]),n[4]=s*i+l*r,n[5]=o*i+u*r,n[6]=a*i+d*r,n[7]=c*i+h*r,n[8]=l*i-s*r,n[9]=u*i-o*r,n[10]=d*i-a*r,n[11]=h*i-c*r,n}function Bv(n,e,t){const r=Math.sin(t),i=Math.cos(t),s=e[0],o=e[1],a=e[2],c=e[3],l=e[8],u=e[9],d=e[10],h=e[11];return e!==n&&(n[4]=e[4],n[5]=e[5],n[6]=e[6],n[7]=e[7],n[12]=e[12],n[13]=e[13],n[14]=e[14],n[15]=e[15]),n[0]=s*i-l*r,n[1]=o*i-u*r,n[2]=a*i-d*r,n[3]=c*i-h*r,n[8]=s*r+l*i,n[9]=o*r+u*i,n[10]=a*r+d*i,n[11]=c*r+h*i,n}function hd(n,e,t){const r=Math.sin(t),i=Math.cos(t),s=e[0],o=e[1],a=e[2],c=e[3],l=e[4],u=e[5],d=e[6],h=e[7];return e!==n&&(n[8]=e[8],n[9]=e[9],n[10]=e[10],n[11]=e[11],n[12]=e[12],n[13]=e[13],n[14]=e[14],n[15]=e[15]),n[0]=s*i+l*r,n[1]=o*i+u*r,n[2]=a*i+d*r,n[3]=c*i+h*r,n[4]=l*i-s*r,n[5]=u*i-o*r,n[6]=d*i-a*r,n[7]=h*i-c*r,n}function Nv(n,e){const t=e[0],r=e[1],i=e[2],s=e[3],o=t+t,a=r+r,c=i+i,l=t*o,u=r*o,d=r*a,h=i*o,m=i*a,p=i*c,g=s*o,b=s*a,_=s*c;return n[0]=1-d-p,n[1]=u+_,n[2]=h-b,n[3]=0,n[4]=u-_,n[5]=1-l-p,n[6]=m+g,n[7]=0,n[8]=h+b,n[9]=m-g,n[10]=1-l-d,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,n}function Ov(n,e,t,r,i,s,o){const a=1/(t-e),c=1/(i-r),l=1/(s-o);return n[0]=s*2*a,n[1]=0,n[2]=0,n[3]=0,n[4]=0,n[5]=s*2*c,n[6]=0,n[7]=0,n[8]=(t+e)*a,n[9]=(i+r)*c,n[10]=(o+s)*l,n[11]=-1,n[12]=0,n[13]=0,n[14]=o*s*2*l,n[15]=0,n}function Fv(n,e,t,r,i){const s=1/Math.tan(e/2);if(n[0]=s/t,n[1]=0,n[2]=0,n[3]=0,n[4]=0,n[5]=s,n[6]=0,n[7]=0,n[8]=0,n[9]=0,n[11]=-1,n[12]=0,n[13]=0,n[15]=0,i!=null&&i!==1/0){const o=1/(r-i);n[10]=(i+r)*o,n[14]=2*i*r*o}else n[10]=-1,n[14]=-2*r;return n}const Uv=Fv;function Dv(n,e,t,r,i,s,o){const a=1/(e-t),c=1/(r-i),l=1/(s-o);return n[0]=-2*a,n[1]=0,n[2]=0,n[3]=0,n[4]=0,n[5]=-2*c,n[6]=0,n[7]=0,n[8]=0,n[9]=0,n[10]=2*l,n[11]=0,n[12]=(e+t)*a,n[13]=(i+r)*c,n[14]=(o+s)*l,n[15]=1,n}const kv=Dv;function $v(n,e,t,r){let i,s,o,a,c,l,u,d,h,m;const p=e[0],g=e[1],b=e[2],_=r[0],y=r[1],v=r[2],w=t[0],x=t[1],T=t[2];return Math.abs(p-w)<vn&&Math.abs(g-x)<vn&&Math.abs(b-T)<vn?Iv(n):(d=p-w,h=g-x,m=b-T,i=1/Math.sqrt(d*d+h*h+m*m),d*=i,h*=i,m*=i,s=y*m-v*h,o=v*d-_*m,a=_*h-y*d,i=Math.sqrt(s*s+o*o+a*a),i?(i=1/i,s*=i,o*=i,a*=i):(s=0,o=0,a=0),c=h*a-m*o,l=m*s-d*a,u=d*o-h*s,i=Math.sqrt(c*c+l*l+u*u),i?(i=1/i,c*=i,l*=i,u*=i):(c=0,l=0,u=0),n[0]=s,n[1]=c,n[2]=d,n[3]=0,n[4]=o,n[5]=l,n[6]=h,n[7]=0,n[8]=a,n[9]=u,n[10]=m,n[11]=0,n[12]=-(s*p+o*g+a*b),n[13]=-(c*p+l*g+u*b),n[14]=-(d*p+h*g+m*b),n[15]=1,n)}function Vv(){const n=new Me(4);return Me!=Float32Array&&(n[0]=0,n[1]=0,n[2]=0,n[3]=0),n}function Gv(n,e,t){return n[0]=e[0]+t[0],n[1]=e[1]+t[1],n[2]=e[2]+t[2],n[3]=e[3]+t[3],n}function md(n,e,t){return n[0]=e[0]*t,n[1]=e[1]*t,n[2]=e[2]*t,n[3]=e[3]*t,n}function zv(n){const e=n[0],t=n[1],r=n[2],i=n[3];return Math.sqrt(e*e+t*t+r*r+i*i)}function Wv(n){const e=n[0],t=n[1],r=n[2],i=n[3];return e*e+t*t+r*r+i*i}function Hv(n,e){const t=e[0],r=e[1],i=e[2],s=e[3];let o=t*t+r*r+i*i+s*s;return o>0&&(o=1/Math.sqrt(o)),n[0]=t*o,n[1]=r*o,n[2]=i*o,n[3]=s*o,n}function jv(n,e){return n[0]*e[0]+n[1]*e[1]+n[2]*e[2]+n[3]*e[3]}function Xv(n,e,t,r){const i=e[0],s=e[1],o=e[2],a=e[3];return n[0]=i+r*(t[0]-i),n[1]=s+r*(t[1]-s),n[2]=o+r*(t[2]-o),n[3]=a+r*(t[3]-a),n}function pd(n,e,t){const r=e[0],i=e[1],s=e[2],o=e[3];return n[0]=t[0]*r+t[4]*i+t[8]*s+t[12]*o,n[1]=t[1]*r+t[5]*i+t[9]*s+t[13]*o,n[2]=t[2]*r+t[6]*i+t[10]*s+t[14]*o,n[3]=t[3]*r+t[7]*i+t[11]*s+t[15]*o,n}function Kv(n,e,t){const r=e[0],i=e[1],s=e[2],o=t[0],a=t[1],c=t[2],l=t[3],u=l*r+a*s-c*i,d=l*i+c*r-o*s,h=l*s+o*i-a*r,m=-o*r-a*i-c*s;return n[0]=u*l+m*-o+d*-c-h*-a,n[1]=d*l+m*-a+h*-o-u*-c,n[2]=h*l+m*-c+u*-a-d*-o,n[3]=e[3],n}(function(){const n=Vv();return function(e,t,r,i,s,o){let a,c;for(t||(t=4),r||(r=0),i?c=Math.min(i*t+r,e.length):c=e.length,a=r;a<c;a+=t)n[0]=e[a],n[1]=e[a+1],n[2]=e[a+2],n[3]=e[a+3],s(n,n,o),e[a]=n[0],e[a+1]=n[1],e[a+2]=n[2],e[a+3]=n[3];return e}})();var Mo;(function(n){n[n.COL0ROW0=0]="COL0ROW0",n[n.COL0ROW1=1]="COL0ROW1",n[n.COL0ROW2=2]="COL0ROW2",n[n.COL0ROW3=3]="COL0ROW3",n[n.COL1ROW0=4]="COL1ROW0",n[n.COL1ROW1=5]="COL1ROW1",n[n.COL1ROW2=6]="COL1ROW2",n[n.COL1ROW3=7]="COL1ROW3",n[n.COL2ROW0=8]="COL2ROW0",n[n.COL2ROW1=9]="COL2ROW1",n[n.COL2ROW2=10]="COL2ROW2",n[n.COL2ROW3=11]="COL2ROW3",n[n.COL3ROW0=12]="COL3ROW0",n[n.COL3ROW1=13]="COL3ROW1",n[n.COL3ROW2=14]="COL3ROW2",n[n.COL3ROW3=15]="COL3ROW3"})(Mo||(Mo={}));const qv=45*Math.PI/180,Yv=1,gs=.1,bs=500,Qv=Object.freeze([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);class $ extends ud{static get IDENTITY(){return Jv()}static get ZERO(){return Zv()}get ELEMENTS(){return 16}get RANK(){return 4}get INDICES(){return Mo}constructor(e){super(-0,-0,-0,-0,-0,-0,-0,-0,-0,-0,-0,-0,-0,-0,-0,-0),arguments.length===1&&Array.isArray(e)?this.copy(e):this.identity()}copy(e){return this[0]=e[0],this[1]=e[1],this[2]=e[2],this[3]=e[3],this[4]=e[4],this[5]=e[5],this[6]=e[6],this[7]=e[7],this[8]=e[8],this[9]=e[9],this[10]=e[10],this[11]=e[11],this[12]=e[12],this[13]=e[13],this[14]=e[14],this[15]=e[15],this.check()}set(e,t,r,i,s,o,a,c,l,u,d,h,m,p,g,b){return this[0]=e,this[1]=t,this[2]=r,this[3]=i,this[4]=s,this[5]=o,this[6]=a,this[7]=c,this[8]=l,this[9]=u,this[10]=d,this[11]=h,this[12]=m,this[13]=p,this[14]=g,this[15]=b,this.check()}setRowMajor(e,t,r,i,s,o,a,c,l,u,d,h,m,p,g,b){return this[0]=e,this[1]=s,this[2]=l,this[3]=m,this[4]=t,this[5]=o,this[6]=u,this[7]=p,this[8]=r,this[9]=a,this[10]=d,this[11]=g,this[12]=i,this[13]=c,this[14]=h,this[15]=b,this.check()}toRowMajor(e){return e[0]=this[0],e[1]=this[4],e[2]=this[8],e[3]=this[12],e[4]=this[1],e[5]=this[5],e[6]=this[9],e[7]=this[13],e[8]=this[2],e[9]=this[6],e[10]=this[10],e[11]=this[14],e[12]=this[3],e[13]=this[7],e[14]=this[11],e[15]=this[15],e}identity(){return this.copy(Qv)}fromObject(e){return this.check()}fromQuaternion(e){return Nv(this,e),this.check()}frustum(e){const{left:t,right:r,bottom:i,top:s,near:o=gs,far:a=bs}=e;return a===1/0?ex(this,t,r,i,s,o):Ov(this,t,r,i,s,o,a),this.check()}lookAt(e){const{eye:t,center:r=[0,0,0],up:i=[0,1,0]}=e;return $v(this,t,r,i),this.check()}ortho(e){const{left:t,right:r,bottom:i,top:s,near:o=gs,far:a=bs}=e;return kv(this,t,r,i,s,o,a),this.check()}orthographic(e){const{fovy:t=qv,aspect:r=Yv,focalDistance:i=1,near:s=gs,far:o=bs}=e;ol(t);const a=t/2,c=i*Math.tan(a),l=c*r;return this.ortho({left:-l,right:l,bottom:-c,top:c,near:s,far:o})}perspective(e){const{fovy:t=45*Math.PI/180,aspect:r=1,near:i=.1,far:s=500}=e;return ol(t),Uv(this,t,r,i,s),this.check()}determinant(){return Cv(this)}getScale(e=[-0,-0,-0]){return e[0]=Math.sqrt(this[0]*this[0]+this[1]*this[1]+this[2]*this[2]),e[1]=Math.sqrt(this[4]*this[4]+this[5]*this[5]+this[6]*this[6]),e[2]=Math.sqrt(this[8]*this[8]+this[9]*this[9]+this[10]*this[10]),e}getTranslation(e=[-0,-0,-0]){return e[0]=this[12],e[1]=this[13],e[2]=this[14],e}getRotation(e,t){e=e||[-0,-0,-0,-0,-0,-0,-0,-0,-0,-0,-0,-0,-0,-0,-0,-0],t=t||[-0,-0,-0];const r=this.getScale(t),i=1/r[0],s=1/r[1],o=1/r[2];return e[0]=this[0]*i,e[1]=this[1]*s,e[2]=this[2]*o,e[3]=0,e[4]=this[4]*i,e[5]=this[5]*s,e[6]=this[6]*o,e[7]=0,e[8]=this[8]*i,e[9]=this[9]*s,e[10]=this[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,e}getRotationMatrix3(e,t){e=e||[-0,-0,-0,-0,-0,-0,-0,-0,-0],t=t||[-0,-0,-0];const r=this.getScale(t),i=1/r[0],s=1/r[1],o=1/r[2];return e[0]=this[0]*i,e[1]=this[1]*s,e[2]=this[2]*o,e[3]=this[4]*i,e[4]=this[5]*s,e[5]=this[6]*o,e[6]=this[8]*i,e[7]=this[9]*s,e[8]=this[10]*o,e}transpose(){return Mv(this,this),this.check()}invert(){return Lv(this,this),this.check()}multiplyLeft(e){return sl(this,e,this),this.check()}multiplyRight(e){return sl(this,this,e),this.check()}rotateX(e){return dd(this,this,e),this.check()}rotateY(e){return Bv(this,this,e),this.check()}rotateZ(e){return hd(this,this,e),this.check()}rotateXYZ(e){return this.rotateX(e[0]).rotateY(e[1]).rotateZ(e[2])}rotateAxis(e,t){return Pv(this,this,e,t),this.check()}scale(e){return fd(this,this,Array.isArray(e)?e:[e,e,e]),this.check()}translate(e){return Io(this,this,e),this.check()}transform(e,t){return e.length===4?(t=pd(t||[-0,-0,-0,-0],e,this),yn(t,4),t):this.transformAsPoint(e,t)}transformAsPoint(e,t){const{length:r}=e;let i;switch(r){case 2:i=iv(t||[-0,-0],e,this);break;case 3:i=Ca(t||[-0,-0,-0],e,this);break;default:throw new Error("Illegal vector")}return yn(i,e.length),i}transformAsVector(e,t){let r;switch(e.length){case 2:r=sv(t||[-0,-0],e,this);break;case 3:r=id(t||[-0,-0,-0],e,this);break;default:throw new Error("Illegal vector")}return yn(r,e.length),r}transformPoint(e,t){return this.transformAsPoint(e,t)}transformVector(e,t){return this.transformAsPoint(e,t)}transformDirection(e,t){return this.transformAsVector(e,t)}makeRotationX(e){return this.identity().rotateX(e)}makeTranslation(e,t,r){return this.identity().translate([e,t,r])}}let vr,xr;function Zv(){return vr||(vr=new $([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),Object.freeze(vr)),vr}function Jv(){return xr||(xr=new $,Object.freeze(xr)),xr}function ol(n){if(n>Math.PI*2)throw Error("expected radians")}function ex(n,e,t,r,i,s){const o=2*s/(t-e),a=2*s/(i-r),c=(t+e)/(t-e),l=(i+r)/(i-r),u=-1,d=-1,h=-2*s;return n[0]=o,n[1]=0,n[2]=0,n[3]=0,n[4]=0,n[5]=a,n[6]=0,n[7]=0,n[8]=c,n[9]=l,n[10]=u,n[11]=d,n[12]=0,n[13]=0,n[14]=h,n[15]=0,n}function al(){const n=new Me(4);return Me!=Float32Array&&(n[0]=0,n[1]=0,n[2]=0),n[3]=1,n}function tx(n){return n[0]=0,n[1]=0,n[2]=0,n[3]=1,n}function gd(n,e,t){t=t*.5;const r=Math.sin(t);return n[0]=r*e[0],n[1]=r*e[1],n[2]=r*e[2],n[3]=Math.cos(t),n}function cl(n,e,t){const r=e[0],i=e[1],s=e[2],o=e[3],a=t[0],c=t[1],l=t[2],u=t[3];return n[0]=r*u+o*a+i*l-s*c,n[1]=i*u+o*c+s*a-r*l,n[2]=s*u+o*l+r*c-i*a,n[3]=o*u-r*a-i*c-s*l,n}function nx(n,e,t){t*=.5;const r=e[0],i=e[1],s=e[2],o=e[3],a=Math.sin(t),c=Math.cos(t);return n[0]=r*c+o*a,n[1]=i*c+s*a,n[2]=s*c-i*a,n[3]=o*c-r*a,n}function rx(n,e,t){t*=.5;const r=e[0],i=e[1],s=e[2],o=e[3],a=Math.sin(t),c=Math.cos(t);return n[0]=r*c-s*a,n[1]=i*c+o*a,n[2]=s*c+r*a,n[3]=o*c-i*a,n}function ix(n,e,t){t*=.5;const r=e[0],i=e[1],s=e[2],o=e[3],a=Math.sin(t),c=Math.cos(t);return n[0]=r*c+i*a,n[1]=i*c-r*a,n[2]=s*c+o*a,n[3]=o*c-s*a,n}function sx(n,e){const t=e[0],r=e[1],i=e[2];return n[0]=t,n[1]=r,n[2]=i,n[3]=Math.sqrt(Math.abs(1-t*t-r*r-i*i)),n}function Ur(n,e,t,r){const i=e[0],s=e[1],o=e[2],a=e[3];let c=t[0],l=t[1],u=t[2],d=t[3],h,m,p,g,b;return h=i*c+s*l+o*u+a*d,h<0&&(h=-h,c=-c,l=-l,u=-u,d=-d),1-h>vn?(m=Math.acos(h),b=Math.sin(m),p=Math.sin((1-r)*m)/b,g=Math.sin(r*m)/b):(p=1-r,g=r),n[0]=p*i+g*c,n[1]=p*s+g*l,n[2]=p*o+g*u,n[3]=p*a+g*d,n}function ox(n,e){const t=e[0],r=e[1],i=e[2],s=e[3],o=t*t+r*r+i*i+s*s,a=o?1/o:0;return n[0]=-t*a,n[1]=-r*a,n[2]=-i*a,n[3]=s*a,n}function ax(n,e){return n[0]=-e[0],n[1]=-e[1],n[2]=-e[2],n[3]=e[3],n}function bd(n,e){const t=e[0]+e[4]+e[8];let r;if(t>0)r=Math.sqrt(t+1),n[3]=.5*r,r=.5/r,n[0]=(e[5]-e[7])*r,n[1]=(e[6]-e[2])*r,n[2]=(e[1]-e[3])*r;else{let i=0;e[4]>e[0]&&(i=1),e[8]>e[i*3+i]&&(i=2);const s=(i+1)%3,o=(i+2)%3;r=Math.sqrt(e[i*3+i]-e[s*3+s]-e[o*3+o]+1),n[i]=.5*r,r=.5/r,n[3]=(e[s*3+o]-e[o*3+s])*r,n[s]=(e[s*3+i]+e[i*3+s])*r,n[o]=(e[o*3+i]+e[i*3+o])*r}return n}const cx=Gv,lx=md,ux=jv,fx=Xv,dx=zv,hx=Wv,_d=Hv,mx=(function(){const n=od(),e=nl(1,0,0),t=nl(0,1,0);return function(r,i,s){const o=ad(i,s);return o<-.999999?(Fr(n,e,i),bv(n)<1e-6&&Fr(n,t,i),dv(n,n),gd(r,n,Math.PI),r):o>.999999?(r[0]=0,r[1]=0,r[2]=0,r[3]=1,r):(Fr(n,i,s),r[0]=n[0],r[1]=n[1],r[2]=n[2],r[3]=1+o,_d(r,r))}})();(function(){const n=al(),e=al();return function(t,r,i,s,o,a){return Ur(n,r,o,a),Ur(e,i,s,a),Ur(t,n,e,2*a*(1-a)),t}})();(function(){const n=_v();return function(e,t,r,i){return n[0]=r[0],n[3]=r[1],n[6]=r[2],n[1]=i[0],n[4]=i[1],n[7]=i[2],n[2]=-t[0],n[5]=-t[1],n[8]=-t[2],_d(e,bd(e,n))}})();const px=[0,0,0,1];class rP extends La{constructor(e=0,t=0,r=0,i=1){super(-0,-0,-0,-0),Array.isArray(e)&&arguments.length===1?this.copy(e):this.set(e,t,r,i)}copy(e){return this[0]=e[0],this[1]=e[1],this[2]=e[2],this[3]=e[3],this.check()}set(e,t,r,i){return this[0]=e,this[1]=t,this[2]=r,this[3]=i,this.check()}fromObject(e){return this[0]=e.x,this[1]=e.y,this[2]=e.z,this[3]=e.w,this.check()}fromMatrix3(e){return bd(this,e),this.check()}fromAxisRotation(e,t){return gd(this,e,t),this.check()}identity(){return tx(this),this.check()}setAxisAngle(e,t){return this.fromAxisRotation(e,t)}get ELEMENTS(){return 4}get x(){return this[0]}set x(e){this[0]=z(e)}get y(){return this[1]}set y(e){this[1]=z(e)}get z(){return this[2]}set z(e){this[2]=z(e)}get w(){return this[3]}set w(e){this[3]=z(e)}len(){return dx(this)}lengthSquared(){return hx(this)}dot(e){return ux(this,e)}rotationTo(e,t){return mx(this,e,t),this.check()}add(e){return cx(this,this,e),this.check()}calculateW(){return sx(this,this),this.check()}conjugate(){return ax(this,this),this.check()}invert(){return ox(this,this),this.check()}lerp(e,t,r){return r===void 0?this.lerp(this,e,t):(fx(this,e,t,r),this.check())}multiplyRight(e){return cl(this,this,e),this.check()}multiplyLeft(e){return cl(this,e,this),this.check()}normalize(){const e=this.len(),t=e>0?1/e:0;return this[0]=this[0]*t,this[1]=this[1]*t,this[2]=this[2]*t,this[3]=this[3]*t,e===0&&(this[3]=1),this.check()}rotateX(e){return nx(this,this,e),this.check()}rotateY(e){return rx(this,this,e),this.check()}rotateZ(e){return ix(this,this,e),this.check()}scale(e){return lx(this,this,e),this.check()}slerp(e,t,r){let i,s,o;switch(arguments.length){case 1:({start:i=px,target:s,ratio:o}=e);break;case 2:i=this,s=e,o=t;break;default:i=e,s=t,o=r}return Ur(this,i,s,o),this.check()}transformVector4(e,t=new Pa){return Kv(t,e,this),yn(t,4)}lengthSq(){return this.lengthSquared()}setFromAxisAngle(e,t){return this.setAxisAngle(e,t)}premultiply(e){return this.multiplyLeft(e)}multiply(e){return this.multiplyRight(e)}}function yd(n,e=[],t=0){const r=Math.fround(n),i=n-r;return e[t]=r,e[t+1]=i,e}function gx(n){return n-Math.fround(n)}function bx(n){const e=new Float32Array(32);for(let t=0;t<4;++t)for(let r=0;r<4;++r){const i=t*4+r;yd(n[r*4+t],e,i*2)}return e}function vd(n,e=!0){return n??e}function Ba(n=[0,0,0],e=!0){return e?n.map(t=>t/255):[...n]}function _x(n,e=!0){const t=Ba(n.slice(0,3),e),r=Number.isFinite(n[3]),i=r?n[3]:1;return[t[0],t[1],t[2],e&&r?i/255:i]}const yx=`#ifdef LUMA_FP32_TAN_PRECISION_WORKAROUND

// All these functions are for substituting tan() function from Intel GPU only
const float TWO_PI = 6.2831854820251465;
const float PI_2 = 1.5707963705062866;
const float PI_16 = 0.1963495463132858;

const float SIN_TABLE_0 = 0.19509032368659973;
const float SIN_TABLE_1 = 0.3826834261417389;
const float SIN_TABLE_2 = 0.5555702447891235;
const float SIN_TABLE_3 = 0.7071067690849304;

const float COS_TABLE_0 = 0.9807852506637573;
const float COS_TABLE_1 = 0.9238795042037964;
const float COS_TABLE_2 = 0.8314695954322815;
const float COS_TABLE_3 = 0.7071067690849304;

const float INVERSE_FACTORIAL_3 = 1.666666716337204e-01; // 1/3!
const float INVERSE_FACTORIAL_5 = 8.333333767950535e-03; // 1/5!
const float INVERSE_FACTORIAL_7 = 1.9841270113829523e-04; // 1/7!
const float INVERSE_FACTORIAL_9 = 2.75573188446287533e-06; // 1/9!

float sin_taylor_fp32(float a) {
  float r, s, t, x;

  if (a == 0.0) {
    return 0.0;
  }

  x = -a * a;
  s = a;
  r = a;

  r = r * x;
  t = r * INVERSE_FACTORIAL_3;
  s = s + t;

  r = r * x;
  t = r * INVERSE_FACTORIAL_5;
  s = s + t;

  r = r * x;
  t = r * INVERSE_FACTORIAL_7;
  s = s + t;

  r = r * x;
  t = r * INVERSE_FACTORIAL_9;
  s = s + t;

  return s;
}

void sincos_taylor_fp32(float a, out float sin_t, out float cos_t) {
  if (a == 0.0) {
    sin_t = 0.0;
    cos_t = 1.0;
  }
  sin_t = sin_taylor_fp32(a);
  cos_t = sqrt(1.0 - sin_t * sin_t);
}

float tan_taylor_fp32(float a) {
    float sin_a;
    float cos_a;

    if (a == 0.0) {
        return 0.0;
    }

    // 2pi range reduction
    float z = floor(a / TWO_PI);
    float r = a - TWO_PI * z;

    float t;
    float q = floor(r / PI_2 + 0.5);
    int j = int(q);

    if (j < -2 || j > 2) {
        return 1.0 / 0.0;
    }

    t = r - PI_2 * q;

    q = floor(t / PI_16 + 0.5);
    int k = int(q);
    int abs_k = int(abs(float(k)));

    if (abs_k > 4) {
        return 1.0 / 0.0;
    } else {
        t = t - PI_16 * q;
    }

    float u = 0.0;
    float v = 0.0;

    float sin_t, cos_t;
    float s, c;
    sincos_taylor_fp32(t, sin_t, cos_t);

    if (k == 0) {
        s = sin_t;
        c = cos_t;
    } else {
        if (abs(float(abs_k) - 1.0) < 0.5) {
            u = COS_TABLE_0;
            v = SIN_TABLE_0;
        } else if (abs(float(abs_k) - 2.0) < 0.5) {
            u = COS_TABLE_1;
            v = SIN_TABLE_1;
        } else if (abs(float(abs_k) - 3.0) < 0.5) {
            u = COS_TABLE_2;
            v = SIN_TABLE_2;
        } else if (abs(float(abs_k) - 4.0) < 0.5) {
            u = COS_TABLE_3;
            v = SIN_TABLE_3;
        }
        if (k > 0) {
            s = u * sin_t + v * cos_t;
            c = u * cos_t - v * sin_t;
        } else {
            s = u * sin_t - v * cos_t;
            c = u * cos_t + v * sin_t;
        }
    }

    if (j == 0) {
        sin_a = s;
        cos_a = c;
    } else if (j == 1) {
        sin_a = c;
        cos_a = -s;
    } else if (j == -1) {
        sin_a = -c;
        cos_a = s;
    } else {
        sin_a = -s;
        cos_a = -c;
    }
    return sin_a / cos_a;
}
#endif

float tan_fp32(float a) {
#ifdef LUMA_FP32_TAN_PRECISION_WORKAROUND
  return tan_taylor_fp32(a);
#else
  return tan(a);
#endif
}
`,vx=`#ifdef LUMA_FP32_TAN_PRECISION_WORKAROUND
const FP32_TWO_PI: f32 = 6.2831854820251465;
const FP32_PI_2: f32 = 1.5707963705062866;
const FP32_PI_16: f32 = 0.1963495463132858;

const FP32_SIN_TABLE_0: f32 = 0.19509032368659973;
const FP32_SIN_TABLE_1: f32 = 0.3826834261417389;
const FP32_SIN_TABLE_2: f32 = 0.5555702447891235;
const FP32_SIN_TABLE_3: f32 = 0.7071067690849304;

const FP32_COS_TABLE_0: f32 = 0.9807852506637573;
const FP32_COS_TABLE_1: f32 = 0.9238795042037964;
const FP32_COS_TABLE_2: f32 = 0.8314695954322815;
const FP32_COS_TABLE_3: f32 = 0.7071067690849304;

const FP32_INVERSE_FACTORIAL_3: f32 = 1.666666716337204e-01;
const FP32_INVERSE_FACTORIAL_5: f32 = 8.333333767950535e-03;
const FP32_INVERSE_FACTORIAL_7: f32 = 1.9841270113829523e-04;
const FP32_INVERSE_FACTORIAL_9: f32 = 2.75573188446287533e-06;
const FP32_OVERFLOW: f32 = 3.402823466e+38;

fn sin_taylor_fp32(a: f32) -> f32 {
  if (a == 0.0) {
    return 0.0;
  }

  let x = -a * a;
  var sum = a;
  var term = a;

  term = term * x;
  sum = sum + term * FP32_INVERSE_FACTORIAL_3;
  term = term * x;
  sum = sum + term * FP32_INVERSE_FACTORIAL_5;
  term = term * x;
  sum = sum + term * FP32_INVERSE_FACTORIAL_7;
  term = term * x;
  sum = sum + term * FP32_INVERSE_FACTORIAL_9;

  return sum;
}

fn tan_taylor_fp32(a: f32) -> f32 {
  if (a == 0.0) {
    return 0.0;
  }

  let z = floor(a / FP32_TWO_PI);
  let reduced = a - FP32_TWO_PI * z;

  var quadrantValue = floor(reduced / FP32_PI_2 + 0.5);
  let quadrant = i32(quadrantValue);
  if (quadrant < -2 || quadrant > 2) {
    return FP32_OVERFLOW;
  }

  var angle = reduced - FP32_PI_2 * quadrantValue;
  quadrantValue = floor(angle / FP32_PI_16 + 0.5);
  let tableIndex = i32(quadrantValue);
  let absoluteTableIndex = abs(tableIndex);
  if (absoluteTableIndex > 4) {
    return FP32_OVERFLOW;
  }

  angle = angle - FP32_PI_16 * quadrantValue;
  let sinAngle = sin_taylor_fp32(angle);
  let cosAngle = sqrt(1.0 - sinAngle * sinAngle);

  var tableCos = 0.0;
  var tableSin = 0.0;
  if (absoluteTableIndex == 1) {
    tableCos = FP32_COS_TABLE_0;
    tableSin = FP32_SIN_TABLE_0;
  } else if (absoluteTableIndex == 2) {
    tableCos = FP32_COS_TABLE_1;
    tableSin = FP32_SIN_TABLE_1;
  } else if (absoluteTableIndex == 3) {
    tableCos = FP32_COS_TABLE_2;
    tableSin = FP32_SIN_TABLE_2;
  } else if (absoluteTableIndex == 4) {
    tableCos = FP32_COS_TABLE_3;
    tableSin = FP32_SIN_TABLE_3;
  }

  var sinReduced = sinAngle;
  var cosReduced = cosAngle;
  if (tableIndex > 0) {
    sinReduced = tableCos * sinAngle + tableSin * cosAngle;
    cosReduced = tableCos * cosAngle - tableSin * sinAngle;
  } else if (tableIndex < 0) {
    sinReduced = tableCos * sinAngle - tableSin * cosAngle;
    cosReduced = tableCos * cosAngle + tableSin * sinAngle;
  }

  var sinValue = 0.0;
  var cosValue = 0.0;
  if (quadrant == 0) {
    sinValue = sinReduced;
    cosValue = cosReduced;
  } else if (quadrant == 1) {
    sinValue = cosReduced;
    cosValue = -sinReduced;
  } else if (quadrant == -1) {
    sinValue = -cosReduced;
    cosValue = sinReduced;
  } else {
    sinValue = -sinReduced;
    cosValue = -cosReduced;
  }

  return sinValue / cosValue;
}

fn tan_fp32(a: f32) -> f32 {
  return tan_taylor_fp32(a);
}
#else
fn tan_fp32(a: f32) -> f32 {
  return tan(a);
}
#endif
`,xd={name:"fp32",source:vx,vs:yx},ll=`
layout(std140) uniform fp64arithmeticUniforms {
  uniform float ONE;
  uniform float SPLIT;
} fp64;

/*
About LUMA_FP64_CODE_ELIMINATION_WORKAROUND

The purpose of this workaround is to prevent shader compilers from
optimizing away necessary arithmetic operations by swapping their sequences
or transform the equation to some 'equivalent' form.

These helpers implement Dekker/Veltkamp-style error tracking. If the compiler
folds constants or reassociates the arithmetic, the high/low split can stop
tracking the rounding error correctly. That failure mode tends to look fine in
simple coordinate setup, but then breaks down inside iterative arithmetic such
as fp64 Mandelbrot loops.

The method is to multiply an artifical variable, ONE, which will be known to
the compiler to be 1 only at runtime. The whole expression is then represented
as a polynomial with respective to ONE. In the coefficients of all terms, only one a
and one b should appear

err = (a + b) * ONE^6 - a * ONE^5 - (a + b) * ONE^4 + a * ONE^3 - b - (a + b) * ONE^2 + a * ONE
*/

float prevent_fp64_optimization(float value) {
#if defined(LUMA_FP64_CODE_ELIMINATION_WORKAROUND)
  return value + fp64.ONE * 0.0;
#else
  return value;
#endif
}

// Divide float number to high and low floats to extend fraction bits
vec2 split(float a) {
  // Keep SPLIT as a runtime uniform so the compiler cannot fold the Dekker
  // split into a constant expression and reassociate the recovery steps.
  float split = prevent_fp64_optimization(fp64.SPLIT);
  float t = prevent_fp64_optimization(a * split);
  float temp = t - a;
  float a_hi = t - temp;
  float a_lo = a - a_hi;
  return vec2(a_hi, a_lo);
}

// Divide float number again when high float uses too many fraction bits
vec2 split2(vec2 a) {
  vec2 b = split(a.x);
  b.y += a.y;
  return b;
}

// Special sum operation when a > b
vec2 quickTwoSum(float a, float b) {
#if defined(LUMA_FP64_CODE_ELIMINATION_WORKAROUND)
  float sum = (a + b) * fp64.ONE;
  float err = b - (sum - a) * fp64.ONE;
#else
  float sum = a + b;
  float err = b - (sum - a);
#endif
  return vec2(sum, err);
}

// General sum operation
vec2 twoSum(float a, float b) {
  float s = (a + b);
#if defined(LUMA_FP64_CODE_ELIMINATION_WORKAROUND)
  float v = (s * fp64.ONE - a) * fp64.ONE;
  float err = (a - (s - v) * fp64.ONE) * fp64.ONE * fp64.ONE * fp64.ONE + (b - v);
#else
  float v = s - a;
  float err = (a - (s - v)) + (b - v);
#endif
  return vec2(s, err);
}

vec2 twoSub(float a, float b) {
  float s = (a - b);
#if defined(LUMA_FP64_CODE_ELIMINATION_WORKAROUND)
  float v = (s * fp64.ONE - a) * fp64.ONE;
  float err = (a - (s - v) * fp64.ONE) * fp64.ONE * fp64.ONE * fp64.ONE - (b + v);
#else
  float v = s - a;
  float err = (a - (s - v)) - (b + v);
#endif
  return vec2(s, err);
}

vec2 twoSqr(float a) {
  float prod = a * a;
  vec2 a_fp64 = split(a);
#if defined(LUMA_FP64_CODE_ELIMINATION_WORKAROUND)
  float err = ((a_fp64.x * a_fp64.x - prod) * fp64.ONE + 2.0 * a_fp64.x *
    a_fp64.y * fp64.ONE * fp64.ONE) + a_fp64.y * a_fp64.y * fp64.ONE * fp64.ONE * fp64.ONE;
#else
  float err = ((a_fp64.x * a_fp64.x - prod) + 2.0 * a_fp64.x * a_fp64.y) + a_fp64.y * a_fp64.y;
#endif
  return vec2(prod, err);
}

vec2 twoProd(float a, float b) {
  float prod = a * b;
  vec2 a_fp64 = split(a);
  vec2 b_fp64 = split(b);
  // twoProd is especially sensitive because mul_fp64 and div_fp64 both depend
  // on the split terms and cross terms staying in the original evaluation
  // order. If the compiler folds or reassociates them, the low part tends to
  // collapse to zero or NaN on some drivers.
  float highProduct = prevent_fp64_optimization(a_fp64.x * b_fp64.x);
  float crossProduct1 = prevent_fp64_optimization(a_fp64.x * b_fp64.y);
  float crossProduct2 = prevent_fp64_optimization(a_fp64.y * b_fp64.x);
  float lowProduct = prevent_fp64_optimization(a_fp64.y * b_fp64.y);
#if defined(LUMA_FP64_CODE_ELIMINATION_WORKAROUND)
  float err1 = (highProduct - prod) * fp64.ONE;
  float err2 = crossProduct1 * fp64.ONE * fp64.ONE;
  float err3 = crossProduct2 * fp64.ONE * fp64.ONE * fp64.ONE;
  float err4 = lowProduct * fp64.ONE * fp64.ONE * fp64.ONE * fp64.ONE;
#else
  float err1 = highProduct - prod;
  float err2 = crossProduct1;
  float err3 = crossProduct2;
  float err4 = lowProduct;
#endif
  float err = ((err1 + err2) + err3) + err4;
  return vec2(prod, err);
}

vec2 sum_fp64(vec2 a, vec2 b) {
  vec2 s, t;
  s = twoSum(a.x, b.x);
  t = twoSum(a.y, b.y);
  s.y += t.x;
  s = quickTwoSum(s.x, s.y);
  s.y += t.y;
  s = quickTwoSum(s.x, s.y);
  return s;
}

vec2 sub_fp64(vec2 a, vec2 b) {
  vec2 s, t;
  s = twoSub(a.x, b.x);
  t = twoSub(a.y, b.y);
  s.y += t.x;
  s = quickTwoSum(s.x, s.y);
  s.y += t.y;
  s = quickTwoSum(s.x, s.y);
  return s;
}

vec2 mul_fp64(vec2 a, vec2 b) {
  vec2 prod = twoProd(a.x, b.x);
  // y component is for the error
  prod.y += a.x * b.y;
#if defined(LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND)
  prod = split2(prod);
#endif
  prod = quickTwoSum(prod.x, prod.y);
  prod.y += a.y * b.x;
#if defined(LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND)
  prod = split2(prod);
#endif
  prod = quickTwoSum(prod.x, prod.y);
  return prod;
}

vec2 div_fp64(vec2 a, vec2 b) {
  float xn = 1.0 / b.x;
#if defined(LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND)
  vec2 yn = mul_fp64(a, vec2(xn, 0));
#else
  vec2 yn = a * xn;
#endif
  float diff = (sub_fp64(a, mul_fp64(b, yn))).x;
  vec2 prod = twoProd(xn, diff);
  return sum_fp64(yn, prod);
}

vec2 sqrt_fp64(vec2 a) {
  if (a.x == 0.0 && a.y == 0.0) return vec2(0.0, 0.0);
  if (a.x < 0.0) return vec2(0.0 / 0.0, 0.0 / 0.0);

  float x = 1.0 / sqrt(a.x);
  float yn = a.x * x;
#if defined(LUMA_FP64_CODE_ELIMINATION_WORKAROUND)
  vec2 yn_sqr = twoSqr(yn) * fp64.ONE;
#else
  vec2 yn_sqr = twoSqr(yn);
#endif
  float diff = sub_fp64(a, yn_sqr).x;
  vec2 prod = twoProd(x * 0.5, diff);
#if defined(LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND)
  return sum_fp64(split(yn), prod);
#else
  return sum_fp64(vec2(yn, 0.0), prod);
#endif
}
`,xx=`struct Fp64F32Bits {
  sign: u32,
  baseExponent: i32,
  significand: u32,
  isZero: bool,
  isInf: bool,
  isNan: bool,
};

// Decode an f32 as (-1)^sign * significand * 2^baseExponent.
fn fp64_decode_f32_bits(bits: u32) -> Fp64F32Bits {
  let sign = bits >> 31u;
  let exponentBits = (bits >> 23u) & 0xffu;
  let fraction = bits & 0x7fffffu;

  if (exponentBits == 0xffu) {
    return Fp64F32Bits(sign, 0, 0u, false, fraction == 0u, fraction != 0u);
  }
  if (exponentBits == 0u) {
    return Fp64F32Bits(sign, -149, fraction, fraction == 0u, false, false);
  }
  return Fp64F32Bits(sign, i32(exponentBits) - 150, 0x800000u | fraction, false, false, false);
}

fn fp64_f32_magnitude_compare(aBits: u32, bBits: u32) -> i32 {
  let aMagnitude = aBits & 0x7fffffffu;
  let bMagnitude = bBits & 0x7fffffffu;
  if (aMagnitude == bMagnitude) {
    return 0;
  }
  return select(-1, 1, aMagnitude > bMagnitude);
}

fn fp64_make_residual_f32_bits(
  exactSign: u32,
  exactMagnitude: vec2u,
  exactBaseExponent: i32,
  highBits: u32
) -> u32 {
  if (fp64_u64_is_zero(exactMagnitude)) {
    return 0u;
  }

  let high = fp64_decode_f32_bits(highBits);
  if (high.isInf || high.isNan) {
    return exactSign << 31u;
  }
  if (high.isZero) {
    return fp64_make_f32_bits_from_u64(exactSign, exactMagnitude, exactBaseExponent);
  }

  let commonBaseExponent = min(exactBaseExponent, high.baseExponent);
  let exactShift = exactBaseExponent - commonBaseExponent;
  let highShift = high.baseExponent - commonBaseExponent;

  // A normal two-sum/two-product residual never needs a shift this large.
  // This guard gives deterministic underflow behavior outside that contract.
  if (exactShift >= 64 || highShift >= 64) {
    return exactSign << 31u;
  }

  let exactAligned = fp64_u64_shift_left(exactMagnitude, u32(exactShift));
  let highAligned = fp64_u64_shift_left(vec2u(0u, high.significand), u32(highShift));
  let comparison = fp64_u64_compare(exactAligned, highAligned);
  if (comparison == 0) {
    return 0u;
  }

  var residualSign = exactSign;
  var residualMagnitude: vec2u;
  if (comparison > 0) {
    residualMagnitude = fp64_u64_sub(exactAligned, highAligned);
  } else {
    residualSign = exactSign ^ 1u;
    residualMagnitude = fp64_u64_sub(highAligned, exactAligned);
  }
  return fp64_make_f32_bits_from_u64(
    residualSign,
    residualMagnitude,
    commonBaseExponent
  );
}

fn fp64_split_accumulator_bits(
  sign: u32,
  magnitude: vec2u,
  baseExponent: i32
) -> vec2u {
  let highBits = fp64_make_f32_bits_from_u64(sign, magnitude, baseExponent);
  let lowBits = fp64_make_residual_f32_bits(sign, magnitude, baseExponent, highBits);
  return vec2u(highBits, lowBits);
}

fn fp64_two_sum_integer_bits(aBits: u32, bBits: u32) -> vec2u {
  let a = fp64_decode_f32_bits(aBits);
  let b = fp64_decode_f32_bits(bBits);

  if (a.isNan || b.isNan) {
    return vec2u(0x7fc00000u, 0u);
  }
  if (a.isInf || b.isInf) {
    if (a.isInf && b.isInf && a.sign != b.sign) {
      return vec2u(0x7fc00000u, 0u);
    }
    return select(vec2u(bBits, 0u), vec2u(aBits, 0u), a.isInf);
  }
  if (a.isZero && b.isZero) {
    return vec2u((a.sign & b.sign) << 31u, 0u);
  }
  if (a.isZero) {
    return vec2u(bBits, 0u);
  }
  if (b.isZero) {
    return vec2u(aBits, 0u);
  }

  let exponentDifference = select(
    b.baseExponent - a.baseExponent,
    a.baseExponent - b.baseExponent,
    a.baseExponent >= b.baseExponent
  );

  // Beyond half an ulp, rounding cannot change the larger operand. Returning
  // the smaller operand intact also avoids an unbounded integer alignment.
  // At a power-of-two boundary the spacing below the larger operand is half
  // the spacing above it, so an opposite-sign gap-25 operand can still change
  // the rounded high limb. Gap 26 is the first universally safe early-out.
  if (exponentDifference > 25) {
    if (fp64_f32_magnitude_compare(aBits, bBits) >= 0) {
      return vec2u(aBits, bBits);
    }
    return vec2u(bBits, aBits);
  }

  let commonBaseExponent = min(a.baseExponent, b.baseExponent);
  let aMagnitude = fp64_u64_shift_left(
    vec2u(0u, a.significand),
    u32(a.baseExponent - commonBaseExponent)
  );
  let bMagnitude = fp64_u64_shift_left(
    vec2u(0u, b.significand),
    u32(b.baseExponent - commonBaseExponent)
  );

  var resultSign = a.sign;
  var resultMagnitude: vec2u;
  if (a.sign == b.sign) {
    resultMagnitude = fp64_u64_add(aMagnitude, bMagnitude);
  } else {
    let comparison = fp64_u64_compare(aMagnitude, bMagnitude);
    if (comparison == 0) {
      return vec2u(0u, 0u);
    }
    if (comparison > 0) {
      resultMagnitude = fp64_u64_sub(aMagnitude, bMagnitude);
    } else {
      resultSign = b.sign;
      resultMagnitude = fp64_u64_sub(bMagnitude, aMagnitude);
    }
  }

  return fp64_split_accumulator_bits(resultSign, resultMagnitude, commonBaseExponent);
}

fn fp64_two_sum_integer(a: f32, b: f32) -> vec2f {
  let resultBits = fp64_two_sum_integer_bits(bitcast<u32>(a), bitcast<u32>(b));
  return vec2f(bitcast<f32>(resultBits.x), bitcast<f32>(resultBits.y));
}

fn fp64_multiply_significands(a: u32, b: u32) -> vec2u {
  let aLow = a & 0xffffu;
  let aHigh = a >> 16u;
  let bLow = b & 0xffffu;
  let bHigh = b >> 16u;
  let lowProduct = aLow * bLow;
  let crossProduct = aLow * bHigh + aHigh * bLow;
  let highProduct = aHigh * bHigh;

  var result = vec2u(0u, lowProduct);
  result = fp64_u64_add(
    result,
    fp64_u64_shift_left(vec2u(0u, crossProduct), 16u)
  );
  result = fp64_u64_add(result, vec2u(highProduct, 0u));
  return result;
}

fn fp64_two_prod_integer_bits(aBits: u32, bBits: u32) -> vec2u {
  let a = fp64_decode_f32_bits(aBits);
  let b = fp64_decode_f32_bits(bBits);
  let resultSign = a.sign ^ b.sign;

  if (a.isNan || b.isNan || ((a.isZero || b.isZero) && (a.isInf || b.isInf))) {
    return vec2u(0x7fc00000u, 0u);
  }
  if (a.isInf || b.isInf) {
    return vec2u((resultSign << 31u) | 0x7f800000u, resultSign << 31u);
  }
  if (a.isZero || b.isZero) {
    return vec2u(resultSign << 31u, resultSign << 31u);
  }

  let magnitude = fp64_multiply_significands(a.significand, b.significand);
  return fp64_split_accumulator_bits(
    resultSign,
    magnitude,
    a.baseExponent + b.baseExponent
  );
}

fn fp64_two_prod_integer(a: f32, b: f32) -> vec2f {
  let resultBits = fp64_two_prod_integer_bits(bitcast<u32>(a), bitcast<u32>(b));
  return vec2f(bitcast<f32>(resultBits.x), bitcast<f32>(resultBits.y));
}

fn fp64_round_add_integer(a: f32, b: f32) -> f32 {
  return fp64_two_sum_integer(a, b).x;
}

fn fp64_round_mul_integer(a: f32, b: f32) -> f32 {
  return fp64_two_prod_integer(a, b).x;
}

#ifndef LUMA_FP64_PREDICATE_ONLY
fn fp64_f32_finite_exponent(value: Fp64F32Bits) -> i32 {
  let mostSignificantBit = 31u - countLeadingZeros(value.significand);
  return value.baseExponent + i32(mostSignificantBit);
}

fn fp64_scale_f32_integer(value: f32, exponent: i32) -> f32 {
  let decoded = fp64_decode_f32_bits(bitcast<u32>(value));
  if (decoded.isZero || decoded.isInf || decoded.isNan) {
    return value;
  }
  let resultBits = fp64_make_f32_bits_from_u64(
    decoded.sign,
    vec2u(0u, decoded.significand),
    decoded.baseExponent + exponent
  );
  return bitcast<f32>(resultBits);
}

// Divide normalized significands so the hardware operation cannot overflow,
// underflow, or flush a subnormal result. Reapply the exponent with integer
// packing, which also produces subnormal correction limbs without relying on
// floating-point arithmetic to preserve them.
fn fp64_divide_f32_integer(aValue: f32, bValue: f32) -> f32 {
  let a = fp64_decode_f32_bits(bitcast<u32>(aValue));
  let b = fp64_decode_f32_bits(bitcast<u32>(bValue));
  if (a.isZero || b.isZero || a.isInf || b.isInf || a.isNan || b.isNan) {
    return aValue / bValue;
  }

  let aMostSignificantBit = 31u - countLeadingZeros(a.significand);
  let bMostSignificantBit = 31u - countLeadingZeros(b.significand);
  let normalizedABits = fp64_make_f32_bits_from_u64(
    a.sign,
    vec2u(0u, a.significand),
    -i32(aMostSignificantBit)
  );
  let normalizedBBits = fp64_make_f32_bits_from_u64(
    b.sign,
    vec2u(0u, b.significand),
    -i32(bMostSignificantBit)
  );
  let normalizedQuotient = bitcast<f32>(normalizedABits) / bitcast<f32>(normalizedBBits);
  let quotient = fp64_decode_f32_bits(bitcast<u32>(normalizedQuotient));
  let exponentShift =
    a.baseExponent + i32(aMostSignificantBit) -
    b.baseExponent - i32(bMostSignificantBit);
  let quotientBits = fp64_make_f32_bits_from_u64(
    quotient.sign,
    vec2u(0u, quotient.significand),
    quotient.baseExponent + exponentShift
  );
  return bitcast<f32>(quotientBits);
}
#endif

#ifndef LUMA_FP64_PREDICATE_ONLY
fn split(a: f32) -> vec2f {
  let aBits = bitcast<u32>(a);
  let decoded = fp64_decode_f32_bits(aBits);
  if (decoded.isZero || decoded.isInf || decoded.isNan) {
    return vec2f(a, 0.0);
  }

  var roundedHigh = decoded.significand >> 12u;
  let remainder = decoded.significand & 0xfffu;
  if (remainder > 0x800u || (remainder == 0x800u && (roundedHigh & 1u) == 1u)) {
    roundedHigh = roundedHigh + 1u;
  }
  var highMagnitude = vec2u(0u, roundedHigh << 12u);
  var highBits = fp64_make_f32_bits_from_u64(
    decoded.sign,
    highMagnitude,
    decoded.baseExponent
  );
  // Rounding the high limb of a maximum-exponent value can overflow even
  // though the original value is finite. Truncate only in that boundary case
  // so split remains an exact finite decomposition.
  if (fp64_decode_f32_bits(highBits).isInf) {
    roundedHigh = decoded.significand >> 12u;
    highMagnitude = vec2u(0u, roundedHigh << 12u);
    highBits = fp64_make_f32_bits_from_u64(
      decoded.sign,
      highMagnitude,
      decoded.baseExponent
    );
  }
  let lowBits = fp64_make_residual_f32_bits(
    decoded.sign,
    vec2u(0u, decoded.significand),
    decoded.baseExponent,
    highBits
  );
  return vec2f(bitcast<f32>(highBits), bitcast<f32>(lowBits));
}

fn split2(a: vec2f) -> vec2f {
  var result = split(a.x);
  result.y = fp64_round_add_integer(result.y, a.y);
  return result;
}
#endif

#ifndef LUMA_FP64_PREDICATE_ONLY
fn quickTwoSum(a: f32, b: f32) -> vec2f {
  return fp64_two_sum_integer(a, b);
}
#endif

fn twoSum(a: f32, b: f32) -> vec2f {
  return fp64_two_sum_integer(a, b);
}

fn twoSub(a: f32, b: f32) -> vec2f {
  let bBits = bitcast<u32>(b) ^ 0x80000000u;
  let resultBits = fp64_two_sum_integer_bits(bitcast<u32>(a), bBits);
  return vec2f(bitcast<f32>(resultBits.x), bitcast<f32>(resultBits.y));
}

#ifndef LUMA_FP64_PREDICATE_ONLY
fn twoSqr(a: f32) -> vec2f {
  return fp64_two_prod_integer(a, a);
}

fn twoProd(a: f32, b: f32) -> vec2f {
  return fp64_two_prod_integer(a, b);
}
#endif

fn sum_fp64(a: vec2f, b: vec2f) -> vec2f {
  var sum = fp64_two_sum_integer(a.x, b.x);
  let lowSum = fp64_two_sum_integer(a.y, b.y);
  sum.y = fp64_round_add_integer(sum.y, lowSum.x);
  sum = fp64_two_sum_integer(sum.x, sum.y);
  sum.y = fp64_round_add_integer(sum.y, lowSum.y);
  return fp64_two_sum_integer(sum.x, sum.y);
}

fn sub_fp64(a: vec2f, b: vec2f) -> vec2f {
  let negatedB = vec2f(
    bitcast<f32>(bitcast<u32>(b.x) ^ 0x80000000u),
    bitcast<f32>(bitcast<u32>(b.y) ^ 0x80000000u)
  );
  return sum_fp64(a, negatedB);
}

fn mul_fp64(a: vec2f, b: vec2f) -> vec2f {
  var product = fp64_two_prod_integer(a.x, b.x);
  let crossProduct1 = fp64_round_mul_integer(a.x, b.y);
  product.y = fp64_round_add_integer(product.y, crossProduct1);
  product = fp64_two_sum_integer(product.x, product.y);
  let crossProduct2 = fp64_round_mul_integer(a.y, b.x);
  product.y = fp64_round_add_integer(product.y, crossProduct2);
  return fp64_two_sum_integer(product.x, product.y);
}

#ifndef LUMA_FP64_PREDICATE_ONLY
fn fp64_scale_fp64_integer(value: vec2f, exponent: i32) -> vec2f {
  let high = fp64_scale_f32_integer(value.x, exponent);
  let low = fp64_scale_f32_integer(value.y, exponent);
  return sum_fp64(vec2f(high, 0.0), vec2f(low, 0.0));
}

fn fp64_div_fp64_normalized(a: vec2f, b: vec2f) -> vec2f {
  let quotientHigh = fp64_divide_f32_integer(a.x, b.x);
  var quotient = vec2f(quotientHigh, 0.0);

  let remainder = sub_fp64(a, mul_fp64(b, quotient));
  let quotientLow = fp64_divide_f32_integer(remainder.x, b.x);
  quotient = sum_fp64(quotient, vec2f(quotientLow, 0.0));

  let secondRemainder = sub_fp64(a, mul_fp64(b, quotient));
  let correction = fp64_divide_f32_integer(secondRemainder.x, b.x);
  return sum_fp64(quotient, vec2f(correction, 0.0));
}

fn div_fp64(a: vec2f, b: vec2f) -> vec2f {
  let decodedA = fp64_decode_f32_bits(bitcast<u32>(a.x));
  let decodedB = fp64_decode_f32_bits(bitcast<u32>(b.x));
  if (
    decodedA.isZero || decodedB.isZero ||
    decodedA.isInf || decodedB.isInf ||
    decodedA.isNan || decodedB.isNan
  ) {
    return fp64_div_fp64_normalized(a, b);
  }

  let exponentA = fp64_f32_finite_exponent(decodedA);
  let exponentB = fp64_f32_finite_exponent(decodedB);
  // Correct the quotient near unity so b * q and the remainder stay clear of
  // both f32 underflow and overflow. The exponent difference is applied once.
  let normalizedA = fp64_scale_fp64_integer(a, -exponentA);
  let normalizedB = fp64_scale_fp64_integer(b, -exponentB);
  let normalizedQuotient = fp64_div_fp64_normalized(normalizedA, normalizedB);
  return fp64_scale_fp64_integer(normalizedQuotient, exponentA - exponentB);
}

fn fp64_sqrt_fp64_normalized(a: vec2f) -> vec2f {
  let estimate = sqrt(a.x);
  let difference = sub_fp64(a, fp64_two_prod_integer(estimate, estimate)).x;
  let denominator = fp64_round_add_integer(estimate, estimate);
  let correction = fp64_divide_f32_integer(difference, denominator);
  return sum_fp64(vec2f(estimate, 0.0), vec2f(correction, 0.0));
}

fn sqrt_fp64(a: vec2f) -> vec2f {
  let decoded = fp64_decode_f32_bits(bitcast<u32>(a.x));
  let decodedLow = fp64_decode_f32_bits(bitcast<u32>(a.y));
  if (decoded.isZero && decodedLow.isZero) {
    return vec2f(0.0, 0.0);
  }
  if (decoded.sign == 1u) {
    let nanValue = fp64_nan(a.x);
    return vec2f(nanValue, nanValue);
  }

  if (decoded.isInf || decoded.isNan) {
    return fp64_sqrt_fp64_normalized(a);
  }
  let exponent = fp64_f32_finite_exponent(decoded);
  // An even scale lets the final square-root rescale use an integer exponent.
  let evenExponent = exponent - (exponent & 1);
  let normalizedA = fp64_scale_fp64_integer(a, -evenExponent);
  let normalizedRoot = fp64_sqrt_fp64_normalized(normalizedA);
  return fp64_scale_fp64_integer(normalizedRoot, evenExponent / 2);
}
#endif
`,Sx=`struct Fp64ArithmeticUniforms {
  ONE: f32,
  SPLIT: f32,
};

@group(0) @binding(auto) var<uniform> fp64arithmetic : Fp64ArithmeticUniforms;

#ifndef LUMA_FP64_F32_INPUT_ONLY
struct Fp64Bits {
  sign: u32,
  exponent: i32,
  significand: vec2u,
  isZero: bool,
  isInf: bool,
  isNan: bool,
};
#endif

#ifndef LUMA_FP64_PREDICATE_ONLY
fn fp64_nan(seed: f32) -> f32 {
  let nanBits = 0x7fc00000u | select(0u, 1u, seed < 0.0);
  return bitcast<f32>(nanBits);
}
#endif

fn fp64_u64_is_zero(value: vec2u) -> bool {
  return value.x == 0u && value.y == 0u;
}

fn fp64_u64_compare(a: vec2u, b: vec2u) -> i32 {
  if (a.x != b.x) {
    return select(-1, 1, a.x > b.x);
  }
  if (a.y != b.y) {
    return select(-1, 1, a.y > b.y);
  }
  return 0;
}

fn fp64_u64_add(a: vec2u, b: vec2u) -> vec2u {
  let low = a.y + b.y;
  let carry = select(0u, 1u, low < a.y);
  return vec2u(a.x + b.x + carry, low);
}

fn fp64_u64_sub(a: vec2u, b: vec2u) -> vec2u {
  let borrow = select(0u, 1u, a.y < b.y);
  return vec2u(a.x - b.x - borrow, a.y - b.y);
}

fn fp64_u64_shift_left(value: vec2u, shift: u32) -> vec2u {
  if (shift == 0u) {
    return value;
  }
  if (shift < 32u) {
    return vec2u((value.x << shift) | (value.y >> (32u - shift)), value.y << shift);
  }
  if (shift == 32u) {
    return vec2u(value.y, 0u);
  }
  if (shift < 64u) {
    return vec2u(value.y << (shift - 32u), 0u);
  }
  return vec2u(0u);
}

fn fp64_u64_shift_right(value: vec2u, shift: u32) -> vec2u {
  if (shift == 0u) {
    return value;
  }
  if (shift < 32u) {
    return vec2u(value.x >> shift, (value.y >> shift) | (value.x << (32u - shift)));
  }
  if (shift == 32u) {
    return vec2u(0u, value.x);
  }
  if (shift < 64u) {
    return vec2u(0u, value.x >> (shift - 32u));
  }
  return vec2u(0u);
}

fn fp64_u64_get_bit(value: vec2u, bitIndex: u32) -> bool {
  if (bitIndex >= 64u) {
    return false;
  }
  if (bitIndex >= 32u) {
    return ((value.x >> (bitIndex - 32u)) & 1u) != 0u;
  }
  return ((value.y >> bitIndex) & 1u) != 0u;
}

fn fp64_u64_has_bits_below(value: vec2u, bitCount: u32) -> bool {
  if (bitCount == 0u) {
    return false;
  }
  if (bitCount >= 64u) {
    return !fp64_u64_is_zero(value);
  }
  if (bitCount > 32u) {
    let highBitCount = bitCount - 32u;
    let highMask = (1u << highBitCount) - 1u;
    return value.y != 0u || (value.x & highMask) != 0u;
  }
  if (bitCount == 32u) {
    return value.y != 0u;
  }
  let lowMask = (1u << bitCount) - 1u;
  return (value.y & lowMask) != 0u;
}

#ifndef LUMA_FP64_F32_INPUT_ONLY
fn fp64_u64_shift_right_sticky(value: vec2u, shift: u32) -> vec2u {
  var shifted = fp64_u64_shift_right(value, shift);
  if (fp64_u64_has_bits_below(value, shift)) {
    shifted.y = shifted.y | 1u;
  }
  return shifted;
}
#endif

fn fp64_u64_count_leading_zeros(value: vec2u) -> u32 {
  if (value.x != 0u) {
    return countLeadingZeros(value.x);
  }
  return 32u + countLeadingZeros(value.y);
}

fn fp64_round_shift_right_to_u32(value: vec2u, shift: u32) -> u32 {
  if (shift == 0u) {
    return value.y;
  }

  let truncated = fp64_u64_shift_right(value, shift);
  var rounded = truncated.y;
  let guard = fp64_u64_get_bit(value, shift - 1u);
  let hasTrailingBits = fp64_u64_has_bits_below(value, shift - 1u);
  if (guard && (hasTrailingBits || (rounded & 1u) == 1u)) {
    rounded = rounded + 1u;
  }
  return rounded;
}

#ifndef LUMA_FP64_F32_INPUT_ONLY
fn fp64_round_shift_right(value: vec2u, shift: u32) -> vec2u {
  if (shift == 0u) {
    return value;
  }

  var rounded = fp64_u64_shift_right(value, shift);
  let guard = fp64_u64_get_bit(value, shift - 1u);
  let hasTrailingBits = fp64_u64_has_bits_below(value, shift - 1u);
  if (guard && (hasTrailingBits || (rounded.y & 1u) == 1u)) {
    rounded = fp64_u64_add(rounded, vec2u(0u, 1u));
  }
  return rounded;
}
#endif

fn fp64_make_f32_bits_from_u64(sign: u32, significand: vec2u, baseExponent: i32) -> u32 {
  if (fp64_u64_is_zero(significand)) {
    return sign << 31u;
  }

  let leadingZeros = fp64_u64_count_leading_zeros(significand);
  let mostSignificantBit = 63u - leadingZeros;
  var exponent = baseExponent + i32(mostSignificantBit);

  if (exponent > 127) {
    return (sign << 31u) | 0x7f800000u;
  }

  if (exponent >= -126) {
    let shift = i32(mostSignificantBit) - 23;
    var significand24: u32;
    if (shift > 0) {
      significand24 = fp64_round_shift_right_to_u32(significand, u32(shift));
    } else {
      significand24 = fp64_u64_shift_left(significand, u32(-shift)).y;
    }

    if (significand24 >= 0x1000000u) {
      significand24 = significand24 >> 1u;
      exponent = exponent + 1;
      if (exponent > 127) {
        return (sign << 31u) | 0x7f800000u;
      }
    }

    return (sign << 31u) | (u32(exponent + 127) << 23u) | (significand24 & 0x7fffffu);
  }

  let scaleExponent = baseExponent + 149;
  var mantissa: u32;
  if (scaleExponent >= 0) {
    mantissa = fp64_u64_shift_left(significand, u32(scaleExponent)).y;
  } else {
    mantissa = fp64_round_shift_right_to_u32(significand, u32(-scaleExponent));
  }

  if (mantissa >= 0x800000u) {
    return (sign << 31u) | 0x00800000u;
  }
  return (sign << 31u) | mantissa;
}

#ifndef LUMA_FP64_F32_INPUT_ONLY
fn fp64_decode_bits(bits: vec2u) -> Fp64Bits {
  let sign = bits.x >> 31u;
  let exponentBits = (bits.x >> 20u) & 0x7ffu;
  let fractionHigh = bits.x & 0xfffffu;
  let fractionLow = bits.y;
  let fraction = vec2u(fractionHigh, fractionLow);

  if (exponentBits == 0x7ffu) {
    let isInf = fp64_u64_is_zero(fraction);
    return Fp64Bits(sign, 0, vec2u(0u), false, isInf, !isInf);
  }

  if (exponentBits == 0u) {
    let isZero = fp64_u64_is_zero(fraction);
    return Fp64Bits(sign, -1022, fraction, isZero, false, false);
  }

  return Fp64Bits(sign, i32(exponentBits) - 1023, vec2u((1u << 20u) | fractionHigh, fractionLow), false, false, false);
}

fn fp64_finite_magnitude_compare(a: Fp64Bits, b: Fp64Bits) -> i32 {
  if (a.exponent != b.exponent) {
    return select(-1, 1, a.exponent > b.exponent);
  }
  return fp64_u64_compare(a.significand, b.significand);
}
#endif

#ifndef LUMA_FP64_F32_INPUT_ONLY
struct Fp64RawF32Bits {
  sign: u32,
  baseExponent: i32,
  significand: u32,
  isZero: bool,
  isInf: bool,
  isNan: bool,
};

// Decode an f32 as (-1)^sign * significand * 2^baseExponent. This shared
// integer representation lets normalization remain independent of the
// selected double-single arithmetic implementation.
fn fp64_decode_raw_f32_bits(bits: u32) -> Fp64RawF32Bits {
  let sign = bits >> 31u;
  let exponentBits = (bits >> 23u) & 0xffu;
  let fraction = bits & 0x7fffffu;

  if (exponentBits == 0xffu) {
    return Fp64RawF32Bits(sign, 0, 0u, false, fraction == 0u, fraction != 0u);
  }
  if (exponentBits == 0u) {
    return Fp64RawF32Bits(sign, -149, fraction, fraction == 0u, false, false);
  }
  return Fp64RawF32Bits(
    sign,
    i32(exponentBits) - 150,
    0x800000u | fraction,
    false,
    false,
    false
  );
}

fn fp64_raw_f32_magnitude_compare(aBits: u32, bBits: u32) -> i32 {
  let aMagnitude = aBits & 0x7fffffffu;
  let bMagnitude = bBits & 0x7fffffffu;
  if (aMagnitude == bMagnitude) {
    return 0;
  }
  return select(-1, 1, aMagnitude > bMagnitude);
}

fn fp64_make_raw_residual_f32_bits(
  exactSign: u32,
  exactMagnitude: vec2u,
  exactBaseExponent: i32,
  highBits: u32
) -> u32 {
  if (fp64_u64_is_zero(exactMagnitude)) {
    return 0u;
  }

  let high = fp64_decode_raw_f32_bits(highBits);
  if (high.isInf || high.isNan) {
    return 0u;
  }
  if (high.isZero) {
    return fp64_make_f32_bits_from_u64(exactSign, exactMagnitude, exactBaseExponent);
  }

  let commonBaseExponent = min(exactBaseExponent, high.baseExponent);
  let exactShift = exactBaseExponent - commonBaseExponent;
  let highShift = high.baseExponent - commonBaseExponent;
  if (exactShift >= 64 || highShift >= 64) {
    return 0u;
  }

  let exactAligned = fp64_u64_shift_left(exactMagnitude, u32(exactShift));
  let highAligned = fp64_u64_shift_left(vec2u(0u, high.significand), u32(highShift));
  let comparison = fp64_u64_compare(exactAligned, highAligned);
  if (comparison == 0) {
    return 0u;
  }

  var residualSign = exactSign;
  var residualMagnitude: vec2u;
  if (comparison > 0) {
    residualMagnitude = fp64_u64_sub(exactAligned, highAligned);
  } else {
    residualSign = exactSign ^ 1u;
    residualMagnitude = fp64_u64_sub(highAligned, exactAligned);
  }
  return fp64_make_f32_bits_from_u64(
    residualSign,
    residualMagnitude,
    commonBaseExponent
  );
}

fn fp64_split_raw_accumulator_bits(
  sign: u32,
  magnitude: vec2u,
  baseExponent: i32
) -> vec2u {
  if (fp64_u64_is_zero(magnitude)) {
    return vec2u(0u);
  }
  let highBits = fp64_make_f32_bits_from_u64(sign, magnitude, baseExponent);
  let rawLowBits = fp64_make_raw_residual_f32_bits(sign, magnitude, baseExponent, highBits);
  let lowBits = select(rawLowBits, 0u, (rawLowBits & 0x7fffffffu) == 0u);
  if ((highBits & 0x7fffffffu) == 0u && (lowBits & 0x7fffffffu) == 0u) {
    return vec2u(0u);
  }
  return vec2u(highBits, lowBits);
}
#endif

#ifndef LUMA_FP64_F32_INPUT_ONLY
// Round an arithmetic accumulator to binary64 before splitting it. The
// aligned add/subtract paths retain three guard bits plus a sticky bit, which
// is sufficient for round-to-nearest-even at the binary64 boundary.
fn fp64_split_binary64_accumulator_bits(
  sign: u32,
  magnitude: vec2u,
  baseExponent: i32
) -> vec2u {
  if (fp64_u64_is_zero(magnitude)) {
    return vec2u(0u);
  }

  let mostSignificantBit = 63u - fp64_u64_count_leading_zeros(magnitude);
  let exponent = baseExponent + i32(mostSignificantBit);
  if (exponent > 1023) {
    return vec2u((sign << 31u) | 0x7f800000u, 0u);
  }

  var roundedMagnitude = magnitude;
  var roundedBaseExponent = baseExponent;
  if (exponent >= -1022) {
    if (mostSignificantBit > 52u) {
      let shift = mostSignificantBit - 52u;
      roundedMagnitude = fp64_round_shift_right(magnitude, shift);
      roundedBaseExponent = baseExponent + i32(shift);
    }
  } else {
    let shift = -1074 - baseExponent;
    if (shift > 0) {
      roundedMagnitude = fp64_round_shift_right(magnitude, u32(shift));
      roundedBaseExponent = -1074;
    }
  }

  if (fp64_u64_is_zero(roundedMagnitude)) {
    return vec2u(0u);
  }
  return fp64_split_raw_accumulator_bits(sign, roundedMagnitude, roundedBaseExponent);
}
#endif

#ifndef LUMA_FP64_PREDICATE_ONLY
fn fp64_add_raw_f32_bits(aBits: u32, bBits: u32) -> vec2u {
  let a = fp64_decode_raw_f32_bits(aBits);
  let b = fp64_decode_raw_f32_bits(bBits);

  if (a.isNan || b.isNan) {
    return vec2u(0x7fc00000u, 0u);
  }
  if (a.isInf || b.isInf) {
    if (a.isInf && b.isInf && a.sign != b.sign) {
      return vec2u(0x7fc00000u, 0u);
    }
    return select(vec2u(bBits, 0u), vec2u(aBits, 0u), a.isInf);
  }
  if (a.isZero && b.isZero) {
    return vec2u(0u);
  }
  if (a.isZero) {
    return vec2u(bBits, 0u);
  }
  if (b.isZero) {
    return vec2u(aBits, 0u);
  }

  let exponentDifference = abs(a.baseExponent - b.baseExponent);
  if (exponentDifference > 25) {
    if (fp64_raw_f32_magnitude_compare(aBits, bBits) >= 0) {
      return vec2u(aBits, bBits);
    }
    return vec2u(bBits, aBits);
  }

  let commonBaseExponent = min(a.baseExponent, b.baseExponent);
  let aMagnitude = fp64_u64_shift_left(
    vec2u(0u, a.significand),
    u32(a.baseExponent - commonBaseExponent)
  );
  let bMagnitude = fp64_u64_shift_left(
    vec2u(0u, b.significand),
    u32(b.baseExponent - commonBaseExponent)
  );

  var resultSign = a.sign;
  var resultMagnitude: vec2u;
  if (a.sign == b.sign) {
    resultMagnitude = fp64_u64_add(aMagnitude, bMagnitude);
  } else {
    let comparison = fp64_u64_compare(aMagnitude, bMagnitude);
    if (comparison == 0) {
      return vec2u(0u);
    }
    if (comparison > 0) {
      resultMagnitude = fp64_u64_sub(aMagnitude, bMagnitude);
    } else {
      resultSign = b.sign;
      resultMagnitude = fp64_u64_sub(bMagnitude, aMagnitude);
    }
  }

  return fp64_split_raw_accumulator_bits(
    resultSign,
    resultMagnitude,
    commonBaseExponent
  );
}
#endif

#ifndef LUMA_FP64_F32_INPUT_ONLY
fn fp64_add_aligned_magnitudes_to_fp64_bits(
  sign: u32,
  larger: Fp64Bits,
  smaller: Fp64Bits
) -> vec2u {
  let largeSignificand = fp64_u64_shift_left(larger.significand, 3u);
  let smallSignificand = fp64_u64_shift_right_sticky(
    fp64_u64_shift_left(smaller.significand, 3u),
    u32(larger.exponent - smaller.exponent)
  );
  let resultSignificand = fp64_u64_add(largeSignificand, smallSignificand);
  return fp64_split_binary64_accumulator_bits(
    sign,
    resultSignificand,
    larger.exponent - 55
  );
}

fn fp64_sub_aligned_magnitudes_to_fp64_bits(
  sign: u32,
  larger: Fp64Bits,
  smaller: Fp64Bits
) -> vec2u {
  let largeSignificand = fp64_u64_shift_left(larger.significand, 3u);
  let smallSignificand = fp64_u64_shift_right_sticky(
    fp64_u64_shift_left(smaller.significand, 3u),
    u32(larger.exponent - smaller.exponent)
  );
  let resultSignificand = fp64_u64_sub(largeSignificand, smallSignificand);
  return fp64_split_binary64_accumulator_bits(
    sign,
    resultSignificand,
    larger.exponent - 55
  );
}

fn fp64_add_aligned_magnitudes_to_f32_bits(sign: u32, larger: Fp64Bits, smaller: Fp64Bits) -> u32 {
  let largeSignificand = fp64_u64_shift_left(larger.significand, 3u);
  let smallSignificand = fp64_u64_shift_right_sticky(
    fp64_u64_shift_left(smaller.significand, 3u),
    u32(larger.exponent - smaller.exponent)
  );
  let resultSignificand = fp64_u64_add(largeSignificand, smallSignificand);
  return fp64_make_f32_bits_from_u64(sign, resultSignificand, larger.exponent - 55);
}

fn fp64_sub_aligned_magnitudes_to_f32_bits(sign: u32, larger: Fp64Bits, smaller: Fp64Bits) -> u32 {
  let largeSignificand = fp64_u64_shift_left(larger.significand, 3u);
  let smallSignificand = fp64_u64_shift_right_sticky(
    fp64_u64_shift_left(smaller.significand, 3u),
    u32(larger.exponent - smaller.exponent)
  );
  let resultSignificand = fp64_u64_sub(largeSignificand, smallSignificand);
  return fp64_make_f32_bits_from_u64(sign, resultSignificand, larger.exponent - 55);
}

// Subtract two raw binary64 values and round the exact result once to f32.
// The input words are canonical high/low words: .x contains sign/exponent/high
// fraction bits, and .y contains the low 32 fraction bits.
fn sub_fp64u32_to_f32_bits(aBits: vec2u, bBits: vec2u) -> u32 {
  let a = fp64_decode_bits(aBits);
  let b = fp64_decode_bits(bBits);
  let bSubtractionSign = b.sign ^ 1u;

  if (a.isNan || b.isNan) {
    return 0x7fc00000u;
  }
  if (a.isInf && b.isInf) {
    if (a.sign == bSubtractionSign) {
      return (a.sign << 31u) | 0x7f800000u;
    }
    return 0x7fc00000u;
  }
  if (a.isInf) {
    return (a.sign << 31u) | 0x7f800000u;
  }
  if (b.isInf) {
    return (bSubtractionSign << 31u) | 0x7f800000u;
  }
  if (a.isZero && b.isZero) {
    return select(0u, 0x80000000u, a.sign == 1u && b.sign == 0u);
  }

  let magnitudeComparison = fp64_finite_magnitude_compare(a, b);
  if (a.sign == bSubtractionSign) {
    if (magnitudeComparison >= 0) {
      return fp64_add_aligned_magnitudes_to_f32_bits(a.sign, a, b);
    }
    return fp64_add_aligned_magnitudes_to_f32_bits(a.sign, b, a);
  }

  if (magnitudeComparison == 0) {
    return 0u;
  }
  if (magnitudeComparison > 0) {
    return fp64_sub_aligned_magnitudes_to_f32_bits(a.sign, a, b);
  }
  return fp64_sub_aligned_magnitudes_to_f32_bits(bSubtractionSign, b, a);
}

fn sub_fp64u32_to_f32(aBits: vec2u, bBits: vec2u) -> f32 {
  return bitcast<f32>(sub_fp64u32_to_f32_bits(aBits, bBits));
}

// Subtract two raw binary64 values, round once to binary64, then split the
// result into normalized f32 limbs. Finite results must fit within the f32
// exponent range; larger magnitudes map to infinity and smaller magnitudes
// map to zero. The input words use canonical high/low word order.
fn sub_fp64u32_to_fp64_bits(aBits: vec2u, bBits: vec2u) -> vec2u {
  let a = fp64_decode_bits(aBits);
  let b = fp64_decode_bits(bBits);
  let bSubtractionSign = b.sign ^ 1u;

  if (a.isNan || b.isNan) {
    return vec2u(0x7fc00000u, 0u);
  }
  if (a.isInf && b.isInf) {
    if (a.sign == bSubtractionSign) {
      return vec2u((a.sign << 31u) | 0x7f800000u, 0u);
    }
    return vec2u(0x7fc00000u, 0u);
  }
  if (a.isInf) {
    return vec2u((a.sign << 31u) | 0x7f800000u, 0u);
  }
  if (b.isInf) {
    return vec2u((bSubtractionSign << 31u) | 0x7f800000u, 0u);
  }
  if (a.isZero && b.isZero) {
    return vec2u(0u);
  }

  let magnitudeComparison = fp64_finite_magnitude_compare(a, b);
  if (a.sign == bSubtractionSign) {
    if (magnitudeComparison >= 0) {
      return fp64_add_aligned_magnitudes_to_fp64_bits(a.sign, a, b);
    }
    return fp64_add_aligned_magnitudes_to_fp64_bits(a.sign, b, a);
  }

  if (magnitudeComparison == 0) {
    return vec2u(0u);
  }
  if (magnitudeComparison > 0) {
    return fp64_sub_aligned_magnitudes_to_fp64_bits(a.sign, a, b);
  }
  return fp64_sub_aligned_magnitudes_to_fp64_bits(bSubtractionSign, b, a);
}

fn sub_fp64u32_to_fp64(aBits: vec2u, bBits: vec2u) -> vec2f {
  let resultBits = sub_fp64u32_to_fp64_bits(aBits, bBits);
  return vec2f(bitcast<f32>(resultBits.x), bitcast<f32>(resultBits.y));
}
#endif

#ifndef LUMA_FP64_PREDICATE_ONLY
fn fp64_runtime_zero() -> f32 {
  return fp64arithmetic.ONE * 0.0;
}

fn prevent_fp64_optimization(value: f32) -> f32 {
#ifdef LUMA_FP64_CODE_ELIMINATION_WORKAROUND
  return value + fp64_runtime_zero();
#else
  return value;
#endif
}
#endif

#ifdef LUMA_FP64_INTEGER_ARITHMETIC
${xx}
#else
fn split(a: f32) -> vec2f {
  let splitValue = prevent_fp64_optimization(fp64arithmetic.SPLIT + fp64_runtime_zero());
  let t = prevent_fp64_optimization(a * splitValue);
  let temp = prevent_fp64_optimization(t - a);
  let aHi = prevent_fp64_optimization(t - temp);
  let aLo = prevent_fp64_optimization(a - aHi);
  return vec2f(aHi, aLo);
}

fn split2(a: vec2f) -> vec2f {
  var b = split(a.x);
  b.y = b.y + a.y;
  return b;
}

fn quickTwoSum(a: f32, b: f32) -> vec2f {
#ifdef LUMA_FP64_CODE_ELIMINATION_WORKAROUND
  let sum = prevent_fp64_optimization((a + b) * fp64arithmetic.ONE);
  let err = prevent_fp64_optimization(b - (sum - a) * fp64arithmetic.ONE);
#else
  let sum = prevent_fp64_optimization(a + b);
  let err = prevent_fp64_optimization(b - (sum - a));
#endif
  return vec2f(sum, err);
}

fn twoSum(a: f32, b: f32) -> vec2f {
  let s = prevent_fp64_optimization(a + b);
#ifdef LUMA_FP64_CODE_ELIMINATION_WORKAROUND
  let v = prevent_fp64_optimization((s * fp64arithmetic.ONE - a) * fp64arithmetic.ONE);
  let err =
    prevent_fp64_optimization((a - (s - v) * fp64arithmetic.ONE) *
      fp64arithmetic.ONE *
      fp64arithmetic.ONE *
      fp64arithmetic.ONE) +
    prevent_fp64_optimization(b - v);
#else
  let v = prevent_fp64_optimization(s - a);
  let err = prevent_fp64_optimization(a - (s - v)) + prevent_fp64_optimization(b - v);
#endif
  return vec2f(s, err);
}

fn twoSub(a: f32, b: f32) -> vec2f {
  let s = prevent_fp64_optimization(a - b);
#ifdef LUMA_FP64_CODE_ELIMINATION_WORKAROUND
  let v = prevent_fp64_optimization((s * fp64arithmetic.ONE - a) * fp64arithmetic.ONE);
  let err =
    prevent_fp64_optimization((a - (s - v) * fp64arithmetic.ONE) *
      fp64arithmetic.ONE *
      fp64arithmetic.ONE *
      fp64arithmetic.ONE) -
    prevent_fp64_optimization(b + v);
#else
  let v = prevent_fp64_optimization(s - a);
  let err = prevent_fp64_optimization(a - (s - v)) - prevent_fp64_optimization(b + v);
#endif
  return vec2f(s, err);
}

fn twoSqr(a: f32) -> vec2f {
  let prod = prevent_fp64_optimization(a * a);
  let aFp64 = split(a);
  let highProduct = prevent_fp64_optimization(aFp64.x * aFp64.x);
  let crossProduct = prevent_fp64_optimization(2.0 * aFp64.x * aFp64.y);
  let lowProduct = prevent_fp64_optimization(aFp64.y * aFp64.y);
#ifdef LUMA_FP64_CODE_ELIMINATION_WORKAROUND
  let err =
    (prevent_fp64_optimization(highProduct - prod) * fp64arithmetic.ONE +
      crossProduct * fp64arithmetic.ONE * fp64arithmetic.ONE) +
    lowProduct * fp64arithmetic.ONE * fp64arithmetic.ONE * fp64arithmetic.ONE;
#else
  let err = ((prevent_fp64_optimization(highProduct - prod) + crossProduct) + lowProduct);
#endif
  return vec2f(prod, err);
}

fn twoProd(a: f32, b: f32) -> vec2f {
  let prod = prevent_fp64_optimization(a * b);
  let aFp64 = split(a);
  let bFp64 = split(b);
  let highProduct = prevent_fp64_optimization(aFp64.x * bFp64.x);
  let crossProduct1 = prevent_fp64_optimization(aFp64.x * bFp64.y);
  let crossProduct2 = prevent_fp64_optimization(aFp64.y * bFp64.x);
  let lowProduct = prevent_fp64_optimization(aFp64.y * bFp64.y);
#ifdef LUMA_FP64_CODE_ELIMINATION_WORKAROUND
  let err1 = (highProduct - prod) * fp64arithmetic.ONE;
  let err2 = crossProduct1 * fp64arithmetic.ONE * fp64arithmetic.ONE;
  let err3 = crossProduct2 * fp64arithmetic.ONE * fp64arithmetic.ONE * fp64arithmetic.ONE;
  let err4 =
    lowProduct *
    fp64arithmetic.ONE *
    fp64arithmetic.ONE *
    fp64arithmetic.ONE *
    fp64arithmetic.ONE;
#else
  let err1 = highProduct - prod;
  let err2 = crossProduct1;
  let err3 = crossProduct2;
  let err4 = lowProduct;
#endif
  let err12InputA = prevent_fp64_optimization(err1);
  let err12InputB = prevent_fp64_optimization(err2);
  let err12 = prevent_fp64_optimization(err12InputA + err12InputB);
  let err123InputA = prevent_fp64_optimization(err12);
  let err123InputB = prevent_fp64_optimization(err3);
  let err123 = prevent_fp64_optimization(err123InputA + err123InputB);
  let err1234InputA = prevent_fp64_optimization(err123);
  let err1234InputB = prevent_fp64_optimization(err4);
  let err = prevent_fp64_optimization(err1234InputA + err1234InputB);
  return vec2f(prod, err);
}

fn sum_fp64(a: vec2f, b: vec2f) -> vec2f {
  var s = twoSum(a.x, b.x);
  let t = twoSum(a.y, b.y);
  s.y = prevent_fp64_optimization(s.y + t.x);
  s = quickTwoSum(s.x, s.y);
  s.y = prevent_fp64_optimization(s.y + t.y);
  s = quickTwoSum(s.x, s.y);
  return s;
}

fn sub_fp64(a: vec2f, b: vec2f) -> vec2f {
  var s = twoSub(a.x, b.x);
  let t = twoSub(a.y, b.y);
  s.y = prevent_fp64_optimization(s.y + t.x);
  s = quickTwoSum(s.x, s.y);
  s.y = prevent_fp64_optimization(s.y + t.y);
  s = quickTwoSum(s.x, s.y);
  return s;
}

fn mul_fp64(a: vec2f, b: vec2f) -> vec2f {
  var prod = twoProd(a.x, b.x);
  let crossProduct1 = prevent_fp64_optimization(a.x * b.y);
  prod.y = prevent_fp64_optimization(prod.y + crossProduct1);
#ifdef LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND
  prod = split2(prod);
#endif
  prod = quickTwoSum(prod.x, prod.y);
  let crossProduct2 = prevent_fp64_optimization(a.y * b.x);
  prod.y = prevent_fp64_optimization(prod.y + crossProduct2);
#ifdef LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND
  prod = split2(prod);
#endif
  prod = quickTwoSum(prod.x, prod.y);
  return prod;
}

#ifndef LUMA_FP64_PREDICATE_ONLY
fn div_fp64(a: vec2f, b: vec2f) -> vec2f {
  let xn = prevent_fp64_optimization(1.0 / b.x);
  let yn = mul_fp64(a, vec2f(xn, fp64_runtime_zero()));
  let diff = prevent_fp64_optimization(sub_fp64(a, mul_fp64(b, yn)).x);
  let prod = twoProd(xn, diff);
  return sum_fp64(yn, prod);
}

fn sqrt_fp64(a: vec2f) -> vec2f {
  if (a.x == 0.0 && a.y == 0.0) {
    return vec2f(0.0, 0.0);
  }
  if (a.x < 0.0) {
    let nanValue = fp64_nan(a.x);
    return vec2f(nanValue, nanValue);
  }

  let x = prevent_fp64_optimization(1.0 / sqrt(a.x));
  let yn = prevent_fp64_optimization(a.x * x);
#ifdef LUMA_FP64_CODE_ELIMINATION_WORKAROUND
  let ynSqr = twoSqr(yn) * fp64arithmetic.ONE;
#else
  let ynSqr = twoSqr(yn);
#endif
  let diff = prevent_fp64_optimization(sub_fp64(a, ynSqr).x);
  let prod = twoProd(prevent_fp64_optimization(x * 0.5), diff);
#ifdef LUMA_FP64_HIGH_BITS_OVERFLOW_WORKAROUND
  return sum_fp64(split(yn), prod);
#else
  return sum_fp64(vec2f(yn, 0.0), prod);
#endif
}
#endif
#endif

#ifndef LUMA_FP64_PREDICATE_ONLY
fn fp64_f32_bits_is_nan(bits: u32) -> bool {
  return (bits & 0x7fffffffu) > 0x7f800000u;
}

fn fp64_f32_bits_is_inf(bits: u32) -> bool {
  return (bits & 0x7fffffffu) == 0x7f800000u;
}

fn fp64_compare_f32_bits(aBits: u32, bBits: u32) -> i32 {
  let aMagnitude = aBits & 0x7fffffffu;
  let bMagnitude = bBits & 0x7fffffffu;
  if (aMagnitude == 0u && bMagnitude == 0u) {
    return 0;
  }
  let aSign = aBits >> 31u;
  let bSign = bBits >> 31u;
  if (aSign != bSign) {
    return select(1, -1, aSign == 1u);
  }
  if (aMagnitude == bMagnitude) {
    return 0;
  }
  let magnitudeComparison = select(-1, 1, aMagnitude > bMagnitude);
  return select(magnitudeComparison, -magnitudeComparison, aSign == 1u);
}

// Normalize an arbitrary pair of finite f32 limbs with integer accumulation.
// This is independent of LUMA_FP64_INTEGER_ARITHMETIC and canonicalizes every
// representation of zero to vec2f(+0.0, +0.0).
fn normalize_fp64(value: vec2f) -> vec2f {
  let resultBits = fp64_add_raw_f32_bits(bitcast<u32>(value.x), bitcast<u32>(value.y));
  return vec2f(bitcast<f32>(resultBits.x), bitcast<f32>(resultBits.y));
}

fn is_nan_fp64(value: vec2f) -> bool {
  let normalized = normalize_fp64(value);
  return fp64_f32_bits_is_nan(bitcast<u32>(normalized.x)) ||
    fp64_f32_bits_is_nan(bitcast<u32>(normalized.y));
}

fn is_finite_fp64(value: vec2f) -> bool {
  let normalized = normalize_fp64(value);
  let highBits = bitcast<u32>(normalized.x);
  let lowBits = bitcast<u32>(normalized.y);
  return !fp64_f32_bits_is_nan(highBits) && !fp64_f32_bits_is_nan(lowBits) &&
    !fp64_f32_bits_is_inf(highBits) && !fp64_f32_bits_is_inf(lowBits);
}

// Returns -1, 0, or 1. NaN is unordered and returns 0; call is_nan_fp64 or
// is_finite_fp64 first when 0 must mean a finite zero.
fn sign_fp64(value: vec2f) -> i32 {
  let normalized = normalize_fp64(value);
  let highBits = bitcast<u32>(normalized.x);
  let lowBits = bitcast<u32>(normalized.y);
  if (fp64_f32_bits_is_nan(highBits) || fp64_f32_bits_is_nan(lowBits)) {
    return 0;
  }
  if ((highBits & 0x7fffffffu) != 0u) {
    return select(1, -1, (highBits >> 31u) == 1u);
  }
  if ((lowBits & 0x7fffffffu) != 0u) {
    return select(1, -1, (lowBits >> 31u) == 1u);
  }
  return 0;
}

// Compares double-single values and returns -1, 0, or 1. NaN is unordered
// and returns 0; callers that require equality semantics must first check
// is_nan_fp64 or is_finite_fp64.
fn compare_fp64(a: vec2f, b: vec2f) -> i32 {
  let normalizedA = normalize_fp64(a);
  let normalizedB = normalize_fp64(b);
  let aHighBits = bitcast<u32>(normalizedA.x);
  let aLowBits = bitcast<u32>(normalizedA.y);
  let bHighBits = bitcast<u32>(normalizedB.x);
  let bLowBits = bitcast<u32>(normalizedB.y);
  if (fp64_f32_bits_is_nan(aHighBits) || fp64_f32_bits_is_nan(aLowBits) ||
      fp64_f32_bits_is_nan(bHighBits) || fp64_f32_bits_is_nan(bLowBits)) {
    return 0;
  }
  let highComparison = fp64_compare_f32_bits(aHighBits, bHighBits);
  if (highComparison != 0) {
    return highComparison;
  }
  return fp64_compare_f32_bits(aLowBits, bLowBits);
}
#endif
`,wx={ONE:1,SPLIT:4097},iP={name:"fp64arithmetic",source:Sx,fs:ll,vs:ll,defaultUniforms:wx,uniformTypes:{ONE:"f32",SPLIT:"f32"},fp64ify:yd,fp64LowPart:gx,fp64ifyMatrix4:bx},Tx=[0,1,1,1],Ex=`layout(std140) uniform pickingUniforms {
  float isActive;
  float isAttribute;
  float isHighlightActive;
  float useByteColors;
  vec3 highlightedObjectColor;
  vec4 highlightColor;
} picking;

out vec4 picking_vRGBcolor_Avalid;

// Normalize unsigned byte color to 0-1 range
vec3 picking_normalizeColor(vec3 color) {
  return picking.useByteColors > 0.5 ? color / 255.0 : color;
}

// Normalize unsigned byte color to 0-1 range
vec4 picking_normalizeColor(vec4 color) {
  return picking.useByteColors > 0.5 ? color / 255.0 : color;
}

bool picking_isColorZero(vec3 color) {
  return dot(color, vec3(1.0)) < 0.00001;
}

bool picking_isColorValid(vec3 color) {
  return dot(color, vec3(1.0)) > 0.00001;
}

// Check if this vertex is highlighted 
bool isVertexHighlighted(vec3 vertexColor) {
  vec3 highlightedObjectColor = picking_normalizeColor(picking.highlightedObjectColor);
  return
    bool(picking.isHighlightActive) && picking_isColorZero(abs(vertexColor - highlightedObjectColor));
}

// Set the current picking color
void picking_setPickingColor(vec3 pickingColor) {
  pickingColor = picking_normalizeColor(pickingColor);

  if (bool(picking.isActive)) {
    // Use alpha as the validity flag. If pickingColor is [0, 0, 0] fragment is non-pickable
    picking_vRGBcolor_Avalid.a = float(picking_isColorValid(pickingColor));

    if (!bool(picking.isAttribute)) {
      // Stores the picking color so that the fragment shader can render it during picking
      picking_vRGBcolor_Avalid.rgb = pickingColor;
    }
  } else {
    // Do the comparison with selected item color in vertex shader as it should mean fewer compares
    picking_vRGBcolor_Avalid.a = float(isVertexHighlighted(pickingColor));
  }
}

void picking_setPickingAttribute(float value) {
  if (bool(picking.isAttribute)) {
    picking_vRGBcolor_Avalid.r = value;
  }
}

void picking_setPickingAttribute(vec2 value) {
  if (bool(picking.isAttribute)) {
    picking_vRGBcolor_Avalid.rg = value;
  }
}

void picking_setPickingAttribute(vec3 value) {
  if (bool(picking.isAttribute)) {
    picking_vRGBcolor_Avalid.rgb = value;
  }
}
`,Ax=`layout(std140) uniform pickingUniforms {
  float isActive;
  float isAttribute;
  float isHighlightActive;
  float useByteColors;
  vec3 highlightedObjectColor;
  vec4 highlightColor;
} picking;

in vec4 picking_vRGBcolor_Avalid;

/*
 * Returns highlight color if this item is selected.
 */
vec4 picking_filterHighlightColor(vec4 color) {
  // If we are still picking, we don't highlight
  if (picking.isActive > 0.5) {
    return color;
  }

  bool selected = bool(picking_vRGBcolor_Avalid.a);

  if (selected) {
    // Blend in highlight color based on its alpha value
    float highLightAlpha = picking.highlightColor.a;
    float blendedAlpha = highLightAlpha + color.a * (1.0 - highLightAlpha);
    float highLightRatio = highLightAlpha / blendedAlpha;

    vec3 blendedRGB = mix(color.rgb, picking.highlightColor.rgb, highLightRatio);
    return vec4(blendedRGB, blendedAlpha);
  } else {
    return color;
  }
}

/*
 * Returns picking color if picking enabled else unmodified argument.
 */
vec4 picking_filterPickingColor(vec4 color) {
  if (bool(picking.isActive)) {
    if (picking_vRGBcolor_Avalid.a == 0.0) {
      discard;
    }
    return picking_vRGBcolor_Avalid;
  }
  return color;
}

/*
 * Returns picking color if picking is enabled if not
 * highlight color if this item is selected, otherwise unmodified argument.
 */
vec4 picking_filterColor(vec4 color) {
  vec4 highlightColor = picking_filterHighlightColor(color);
  return picking_filterPickingColor(highlightColor);
}
`,sP={props:{},uniforms:{},name:"picking",uniformTypes:{isActive:"f32",isAttribute:"f32",isHighlightActive:"f32",useByteColors:"f32",highlightedObjectColor:"vec3<f32>",highlightColor:"vec4<f32>"},defaultUniforms:{isActive:!1,isAttribute:!1,isHighlightActive:!1,useByteColors:!0,highlightedObjectColor:[0,0,0],highlightColor:Tx},vs:Ex,fs:Ax,getUniforms:Rx};function Rx(n={},e){const t={},r=vd(n.useByteColors,!0);if(n.highlightedObjectColor!==void 0)if(n.highlightedObjectColor===null)t.isHighlightActive=!1;else{t.isHighlightActive=!0;const i=n.highlightedObjectColor.slice(0,3);t.highlightedObjectColor=i}return n.highlightColor&&(t.highlightColor=_x(n.highlightColor,r)),n.isActive!==void 0&&(t.isActive=!!n.isActive,t.isAttribute=!!n.isAttribute),n.useByteColors!==void 0&&(t.useByteColors=!!n.useByteColors),t}const Mt=64,Ix=`
struct skinUniforms {
  jointMatrix: array<mat4x4<f32>, ${Mt}>,
};

@group(0) @binding(auto) var<uniform> skin: skinUniforms;

#ifdef HAS_INSTANCED_SKIN
@group(0) @binding(auto) var<storage, read> skinJointMatrices: array<mat4x4<f32>>;

fn getInstancedSkinMatrix(
  weights: vec4f,
  joints: vec4u,
  instanceIndex: u32,
  jointsPerInstance: u32
) -> mat4x4<f32> {
  let firstJoint = instanceIndex * jointsPerInstance;
  return (weights.x * skinJointMatrices[firstJoint + joints.x])
       + (weights.y * skinJointMatrices[firstJoint + joints.y])
       + (weights.z * skinJointMatrices[firstJoint + joints.z])
       + (weights.w * skinJointMatrices[firstJoint + joints.w]);
}
#endif

fn getSkinMatrix(weights: vec4f, joints: vec4u) -> mat4x4<f32> {
  return (weights.x * skin.jointMatrix[joints.x])
       + (weights.y * skin.jointMatrix[joints.y])
       + (weights.z * skin.jointMatrix[joints.z])
       + (weights.w * skin.jointMatrix[joints.w]);
}
`,Mx=`
layout(std140) uniform skinUniforms {
  mat4 jointMatrix[SKIN_MAX_JOINTS];
} skin;

#ifdef HAS_INSTANCED_SKIN
uniform highp sampler2D skinJointMatrices;

mat4 getInstancedJointMatrix(uint jointIndex, uint instanceIndex) {
  int firstColumn = int(jointIndex * 4u);
  int row = int(instanceIndex);
  return mat4(
    texelFetch(skinJointMatrices, ivec2(firstColumn, row), 0),
    texelFetch(skinJointMatrices, ivec2(firstColumn + 1, row), 0),
    texelFetch(skinJointMatrices, ivec2(firstColumn + 2, row), 0),
    texelFetch(skinJointMatrices, ivec2(firstColumn + 3, row), 0)
  );
}

mat4 getInstancedSkinMatrix(
  vec4 weights,
  uvec4 joints,
  uint instanceIndex,
  uint jointsPerInstance
) {
  return (weights.x * getInstancedJointMatrix(joints.x, instanceIndex))
       + (weights.y * getInstancedJointMatrix(joints.y, instanceIndex))
       + (weights.z * getInstancedJointMatrix(joints.z, instanceIndex))
       + (weights.w * getInstancedJointMatrix(joints.w, instanceIndex));
}
#endif

mat4 getSkinMatrix(vec4 weights, uvec4 joints) {
  return (weights.x * skin.jointMatrix[joints.x])
       + (weights.y * skin.jointMatrix[joints.y])
       + (weights.z * skin.jointMatrix[joints.z])
       + (weights.w * skin.jointMatrix[joints.w]);
}

`,Lx="",Cx={props:{},uniforms:{},bindings:{},name:"skin",bindingLayout:[{name:"skin",group:0},{name:"skinJointMatrices",group:0,visibility:1}],dependencies:[],source:Ix,vs:Mx,fs:Lx,defines:{SKIN_MAX_JOINTS:Mt},getUniforms:(n={},e)=>{var v,w;const{jointMatrices:t,skinJointMatrices:r,scenegraphsFromGLTF:i,skinIndex:s=0,meshWorldMatrix:o}=n,a=r?{skinJointMatrices:r}:{};if(t)return{jointMatrix:Px(t),...a};const c=(w=(v=i==null?void 0:i.gltf)==null?void 0:v.skins)==null?void 0:w[s];if(!c)return{jointMatrix:[],...a};const{inverseBindMatrices:l,joints:u,skeleton:d}=c,h=i.gltfNodeIndexToNodeMap,m=new Map,p=d===void 0||h==null?void 0:h.get(d),g=p?[p]:i.scenes||[];for(const x of g)x.preorderTraversal((T,{worldMatrix:A})=>{m.set(T.id,A)});const b=o?new $(o).invert():null,_=new Float32Array(Mt*16),y=l==null?void 0:l.value;for(let x=0;x<Math.min(u.length,Mt);x++){const T=h==null?void 0:h.get(u[x]);if(!T)continue;const A=m.get(T.id)||T.matrix,M=b?new $(b).multiplyRight(A):new $(A);y&&y.length>=(x+1)*16&&M.multiplyRight(new $(Array.from(y.slice(x*16,(x+1)*16)))),_.set(M,x*16)}return{jointMatrix:_,...a}},uniformTypes:{jointMatrix:["mat4x4<f32>",Mt]}};function Px(n){const e=new Float32Array(Mt*16);return e.set(n instanceof Float32Array?n.subarray(0,e.length):n.slice(0,e.length)),e}const Bx=`
#ifdef HAS_GPU_CROWD_ANIMATION
@group(0) @binding(auto) var<storage, read> gpuAnimationFrames: array<vec4f>;

fn readGPUAnimationFrame(frame: u32, offset: u32, frameStride: u32) -> vec4f {
  return gpuAnimationFrames[frame * frameStride + offset];
}

fn sampleGPUAnimationFrame(
  frames: vec4f,
  blend: vec4f,
  offset: u32,
  frameStride: u32
) -> vec4f {
  let first = mix(
    readGPUAnimationFrame(u32(frames.x), offset, frameStride),
    readGPUAnimationFrame(u32(frames.y), offset, frameStride),
    frames.z
  );
  if (blend.w <= 0.0) {
    return first;
  }
  let second = mix(
    readGPUAnimationFrame(u32(blend.x), offset, frameStride),
    readGPUAnimationFrame(u32(blend.y), offset, frameStride),
    blend.z
  );
  return mix(first, second, blend.w);
}

fn sampleGPUAnimationMatrix(
  frames: vec4f,
  blend: vec4f,
  firstColumn: u32,
  frameStride: u32
) -> mat4x4f {
  return mat4x4f(
    sampleGPUAnimationFrame(frames, blend, firstColumn, frameStride),
    sampleGPUAnimationFrame(frames, blend, firstColumn + 1u, frameStride),
    sampleGPUAnimationFrame(frames, blend, firstColumn + 2u, frameStride),
    sampleGPUAnimationFrame(frames, blend, firstColumn + 3u, frameStride)
  );
}

fn getGPUAnimatedSkinMatrix(
  weights: vec4f,
  joints: vec4u,
  frames: vec4f,
  blend: vec4f,
  frameStride: u32
) -> mat4x4f {
  return weights.x * sampleGPUAnimationMatrix(frames, blend, 4u + joints.x * 4u, frameStride)
       + weights.y * sampleGPUAnimationMatrix(frames, blend, 4u + joints.y * 4u, frameStride)
       + weights.z * sampleGPUAnimationMatrix(frames, blend, 4u + joints.z * 4u, frameStride)
       + weights.w * sampleGPUAnimationMatrix(frames, blend, 4u + joints.w * 4u, frameStride);
}
#endif

#ifdef HAS_INSTANCED_MORPH
@group(0) @binding(auto) var<storage, read> gpuMorphTargets: array<vec4f>;

#ifndef HAS_GPU_CROWD_ANIMATION
@group(0) @binding(auto) var<storage, read> gpuMorphWeights: array<vec4f>;
#endif

fn getGPUCrowdMorphWeight(
  instanceIndex: u32,
  targetIndex: u32,
  targetCount: u32,
  jointsPerInstance: u32,
  frames: vec4f,
  blend: vec4f,
  frameStride: u32
) -> f32 {
#ifdef HAS_GPU_CROWD_ANIMATION
  let offset = 4u + jointsPerInstance * 4u + targetIndex;
  return sampleGPUAnimationFrame(frames, blend, offset, frameStride).x;
#else
  let packedCount = (targetCount + 3u) / 4u;
  let packedWeights = gpuMorphWeights[instanceIndex * packedCount + targetIndex / 4u];
  return packedWeights[targetIndex % 4u];
#endif
}

fn getGPUCrowdMorphDelta(
  instanceIndex: u32,
  vertexIndex: u32,
  attributeIndex: u32,
  vertexCount: u32,
  targetCount: u32,
  jointsPerInstance: u32,
  frames: vec4f,
  blend: vec4f,
  frameStride: u32
) -> vec3f {
  var result = vec3f(0.0);
  for (var targetIndex = 0u; targetIndex < targetCount; targetIndex++) {
    let weight = getGPUCrowdMorphWeight(
      instanceIndex,
      targetIndex,
      targetCount,
      jointsPerInstance,
      frames,
      blend,
      frameStride
    );
    let offset = (targetIndex * 3u + attributeIndex) * vertexCount + vertexIndex;
    result += gpuMorphTargets[offset].xyz * weight;
  }
  return result;
}
#endif
`,Nx=`
#ifdef HAS_GPU_CROWD_ANIMATION
uniform highp sampler2D gpuAnimationFrames;

vec4 sampleGPUAnimationFrame(vec4 frames, vec4 blend, int offset) {
  vec4 first = mix(
    texelFetch(gpuAnimationFrames, ivec2(offset, int(frames.x)), 0),
    texelFetch(gpuAnimationFrames, ivec2(offset, int(frames.y)), 0),
    frames.z
  );
  if (blend.w <= 0.0) {
    return first;
  }
  vec4 second = mix(
    texelFetch(gpuAnimationFrames, ivec2(offset, int(blend.x)), 0),
    texelFetch(gpuAnimationFrames, ivec2(offset, int(blend.y)), 0),
    blend.z
  );
  return mix(first, second, blend.w);
}

mat4 sampleGPUAnimationMatrix(vec4 frames, vec4 blend, int firstColumn) {
  return mat4(
    sampleGPUAnimationFrame(frames, blend, firstColumn),
    sampleGPUAnimationFrame(frames, blend, firstColumn + 1),
    sampleGPUAnimationFrame(frames, blend, firstColumn + 2),
    sampleGPUAnimationFrame(frames, blend, firstColumn + 3)
  );
}

mat4 getGPUAnimatedSkinMatrix(vec4 weights, uvec4 joints, vec4 frames, vec4 blend) {
  return weights.x * sampleGPUAnimationMatrix(frames, blend, 4 + int(joints.x) * 4)
       + weights.y * sampleGPUAnimationMatrix(frames, blend, 4 + int(joints.y) * 4)
       + weights.z * sampleGPUAnimationMatrix(frames, blend, 4 + int(joints.z) * 4)
       + weights.w * sampleGPUAnimationMatrix(frames, blend, 4 + int(joints.w) * 4);
}
#endif

#ifdef HAS_INSTANCED_MORPH
uniform highp sampler2D gpuMorphTargets;

#ifndef HAS_GPU_CROWD_ANIMATION
uniform highp sampler2D gpuMorphWeights;
#endif

float getGPUCrowdMorphWeight(
  uint instanceIndex,
  uint targetIndex,
  uint jointsPerInstance,
  vec4 frames,
  vec4 blend
) {
#ifdef HAS_GPU_CROWD_ANIMATION
  int offset = 4 + int(jointsPerInstance) * 4 + int(targetIndex);
  return sampleGPUAnimationFrame(frames, blend, offset).x;
#else
  vec4 packedWeights = texelFetch(
    gpuMorphWeights,
    ivec2(int(targetIndex / 4u), int(instanceIndex)),
    0
  );
  return packedWeights[int(targetIndex % 4u)];
#endif
}

vec3 getGPUCrowdMorphDelta(
  uint instanceIndex,
  uint vertexIndex,
  uint attributeIndex,
  uint targetCount,
  uint jointsPerInstance,
  vec4 frames,
  vec4 blend
) {
  vec3 result = vec3(0.0);
  for (uint targetIndex = 0u; targetIndex < targetCount; targetIndex++) {
    float weight = getGPUCrowdMorphWeight(
      instanceIndex,
      targetIndex,
      jointsPerInstance,
      frames,
      blend
    );
    result += texelFetch(
      gpuMorphTargets,
      ivec2(int(vertexIndex), int(targetIndex * 3u + attributeIndex)),
      0
    ).xyz * weight;
  }
  return result;
}
#endif
`,Ox={name:"gpuAnimation",props:{},uniforms:{},bindings:{},source:Bx,vs:Nx,fs:"",bindingLayout:[{name:"gpuAnimationFrames",group:0,visibility:1},{name:"gpuMorphTargets",group:0,visibility:1},{name:"gpuMorphWeights",group:0,visibility:1}],getUniforms(n={}){return n}},ul=`precision highp int;

// #if (defined(SHADER_TYPE_FRAGMENT) && defined(LIGHTING_FRAGMENT)) || (defined(SHADER_TYPE_VERTEX) && defined(LIGHTING_VERTEX))
struct AmbientLight {
  vec3 color;
};

struct PointLight {
  vec3 color;
  vec3 position;
  vec3 attenuation; // 2nd order x:Constant-y:Linear-z:Exponential
};

struct SpotLight {
  vec3 color;
  vec3 position;
  vec3 direction;
  vec3 attenuation;
  vec2 coneCos;
};

struct DirectionalLight {
  vec3 color;
  vec3 direction;
};

struct UniformLight {
  vec3 color;
  vec3 position;
  vec3 direction;
  vec3 attenuation;
  vec2 coneCos;
};

layout(std140) uniform lightingUniforms {
  int enabled;
  int directionalLightCount;
  int pointLightCount;
  int spotLightCount;
  vec3 ambientColor;
  UniformLight lights[5];
} lighting;

PointLight lighting_getPointLight(int index) {
  UniformLight light = lighting.lights[index];
  return PointLight(light.color, light.position, light.attenuation);
}

SpotLight lighting_getSpotLight(int index) {
  UniformLight light = lighting.lights[lighting.pointLightCount + index];
  return SpotLight(light.color, light.position, light.direction, light.attenuation, light.coneCos);
}

DirectionalLight lighting_getDirectionalLight(int index) {
  UniformLight light =
    lighting.lights[lighting.pointLightCount + lighting.spotLightCount + index];
  return DirectionalLight(light.color, light.direction);
}

float getPointLightAttenuation(PointLight pointLight, float distance) {
  return pointLight.attenuation.x
       + pointLight.attenuation.y * distance
       + pointLight.attenuation.z * distance * distance;
}

float getSpotLightAttenuation(SpotLight spotLight, vec3 positionWorldspace) {
  vec3 light_direction = normalize(positionWorldspace - spotLight.position);
  float coneFactor = smoothstep(
    spotLight.coneCos.y,
    spotLight.coneCos.x,
    dot(normalize(spotLight.direction), light_direction)
  );
  float distanceAttenuation = getPointLightAttenuation(
    PointLight(spotLight.color, spotLight.position, spotLight.attenuation),
    distance(spotLight.position, positionWorldspace)
  );
  return distanceAttenuation / max(coneFactor, 0.0001);
}

// #endif
`,Fx=`// #if (defined(SHADER_TYPE_FRAGMENT) && defined(LIGHTING_FRAGMENT)) || (defined(SHADER_TYPE_VERTEX) && defined(LIGHTING_VERTEX))
const MAX_LIGHTS: i32 = 5;

struct AmbientLight {
  color: vec3<f32>,
};

struct PointLight {
  color: vec3<f32>,
  position: vec3<f32>,
  attenuation: vec3<f32>, // 2nd order x:Constant-y:Linear-z:Exponential
};

struct SpotLight {
  color: vec3<f32>,
  position: vec3<f32>,
  direction: vec3<f32>,
  attenuation: vec3<f32>,
  coneCos: vec2<f32>,
};

struct DirectionalLight {
  color: vec3<f32>,
  direction: vec3<f32>,
};

struct UniformLight {
  color: vec3<f32>,
  position: vec3<f32>,
  direction: vec3<f32>,
  attenuation: vec3<f32>,
  coneCos: vec2<f32>,
};

struct lightingUniforms {
  enabled: i32,
  directionalLightCount: i32,
  pointLightCount: i32,
  spotLightCount: i32,
  ambientColor: vec3<f32>,
  lights: array<UniformLight, 5>,
};

@group(2) @binding(auto) var<uniform> lighting : lightingUniforms;

fn lighting_getPointLight(index: i32) -> PointLight {
  let light = lighting.lights[index];
  return PointLight(light.color, light.position, light.attenuation);
}

fn lighting_getSpotLight(index: i32) -> SpotLight {
  let light = lighting.lights[lighting.pointLightCount + index];
  return SpotLight(light.color, light.position, light.direction, light.attenuation, light.coneCos);
}

fn lighting_getDirectionalLight(index: i32) -> DirectionalLight {
  let light = lighting.lights[lighting.pointLightCount + lighting.spotLightCount + index];
  return DirectionalLight(light.color, light.direction);
}

fn getPointLightAttenuation(pointLight: PointLight, distance: f32) -> f32 {
  return pointLight.attenuation.x
       + pointLight.attenuation.y * distance
       + pointLight.attenuation.z * distance * distance;
}

fn getSpotLightAttenuation(spotLight: SpotLight, positionWorldspace: vec3<f32>) -> f32 {
  let lightDirection = normalize(positionWorldspace - spotLight.position);
  let coneFactor = smoothstep(
    spotLight.coneCos.y,
    spotLight.coneCos.x,
    dot(normalize(spotLight.direction), lightDirection)
  );
  let distanceAttenuation = getPointLightAttenuation(
    PointLight(spotLight.color, spotLight.position, spotLight.attenuation),
    distance(spotLight.position, positionWorldspace)
  );
  return distanceAttenuation / max(coneFactor, 0.0001);
}
`,ot=5,Ux={color:"vec3<f32>",position:"vec3<f32>",direction:"vec3<f32>",attenuation:"vec3<f32>",coneCos:"vec2<f32>"},Dx={props:{},uniforms:{},name:"lighting",defines:{},uniformTypes:{enabled:"i32",directionalLightCount:"i32",pointLightCount:"i32",spotLightCount:"i32",ambientColor:"vec3<f32>",lights:[Ux,ot]},defaultUniforms:Dr(),bindingLayout:[{name:"lighting",group:2}],firstBindingSlot:0,source:Fx,vs:ul,fs:ul,getUniforms:kx};function kx(n,e={}){if(n=n&&{...n},!n)return Dr();n.lights&&(n={...n,...Vx(n.lights),lights:void 0});const{useByteColors:t,ambientLight:r,pointLights:i,spotLights:s,directionalLights:o}=n||{};if(!(r||i&&i.length>0||s&&s.length>0||o&&o.length>0))return{...Dr(),enabled:0};const c={...Dr(),...$x({useByteColors:t,ambientLight:r,pointLights:i,spotLights:s,directionalLights:o})};return n.enabled!==void 0&&(c.enabled=n.enabled?1:0),c}function $x({useByteColors:n,ambientLight:e,pointLights:t=[],spotLights:r=[],directionalLights:i=[]}){const s=Sd();let o=0,a=0,c=0,l=0;for(const u of t){if(o>=ot)break;s[o]={...s[o],color:Sr(u,n),position:u.position,attenuation:u.attenuation||[1,0,0]},o++,a++}for(const u of r){if(o>=ot)break;s[o]={...s[o],color:Sr(u,n),position:u.position,direction:u.direction,attenuation:u.attenuation||[1,0,0],coneCos:zx(u)},o++,c++}for(const u of i){if(o>=ot)break;s[o]={...s[o],color:Sr(u,n),direction:u.direction},o++,l++}return t.length+r.length+i.length>ot&&S.warn(`MAX_LIGHTS exceeded, truncating to ${ot}`)(),{ambientColor:Sr(e,n),directionalLightCount:l,pointLightCount:a,spotLightCount:c,lights:s}}function Vx(n){var t,r,i;const e={pointLights:[],spotLights:[],directionalLights:[]};for(const s of n||[])switch(s.type){case"ambient":e.ambientLight=s;break;case"directional":(t=e.directionalLights)==null||t.push(s);break;case"point":(r=e.pointLights)==null||r.push(s);break;case"spot":(i=e.spotLights)==null||i.push(s);break}return e}function Sr(n={},e){const{color:t=[0,0,0],intensity:r=1}=n;return Ba(t,vd(e,!0)).map(s=>s*r)}function Dr(){return{enabled:1,directionalLightCount:0,pointLightCount:0,spotLightCount:0,ambientColor:[.1,.1,.1],lights:Sd()}}function Sd(){return Array.from({length:ot},()=>Gx())}function Gx(){return{color:[1,1,1],position:[1,1,2],direction:[1,1,1],attenuation:[1,0,0],coneCos:[1,0]}}function zx(n){const e=n.innerConeAngle??0,t=n.outerConeAngle??Math.PI/4;return[Math.cos(e),Math.cos(t)]}const Wx=`#ifdef USE_IBL
@group(2) @binding(auto) var pbr_diffuseEnvSampler: texture_cube<f32>;
@group(2) @binding(auto) var pbr_diffuseEnvSamplerSampler: sampler;
@group(2) @binding(auto) var pbr_specularEnvSampler: texture_cube<f32>;
@group(2) @binding(auto) var pbr_specularEnvSamplerSampler: sampler;
@group(2) @binding(auto) var pbr_brdfLUT: texture_2d<f32>;
@group(2) @binding(auto) var pbr_brdfLUTSampler: sampler;
#endif
`,fl=`#ifdef USE_IBL
uniform samplerCube pbr_diffuseEnvSampler;
uniform samplerCube pbr_specularEnvSampler;
uniform sampler2D pbr_brdfLUT;
#endif
`,Hx={name:"ibl",firstBindingSlot:32,bindingLayout:[{name:"pbr_diffuseEnvSampler",group:2},{name:"pbr_specularEnvSampler",group:2},{name:"pbr_brdfLUT",group:2}],source:Wx,vs:fl,fs:fl},jx=`out vec3 pbr_vPosition;
out vec2 pbr_vUV0;
out vec2 pbr_vUV1;

#ifdef HAS_NORMALS
# ifdef HAS_TANGENTS
out mat3 pbr_vTBN;
# else
out vec3 pbr_vNormal;
# endif
#endif

void pbr_setPositionNormalTangentUV(
  vec4 position,
  vec4 normal,
  vec4 tangent,
  vec2 uv0,
  vec2 uv1
)
{
  vec4 pos = pbrProjection.modelMatrix * position;
  pbr_vPosition = vec3(pos.xyz) / pos.w;

#ifdef HAS_NORMALS
#ifdef HAS_TANGENTS
  vec3 normalW = normalize(vec3(pbrProjection.normalMatrix * vec4(normal.xyz, 0.0)));
  vec3 tangentW = normalize(vec3(pbrProjection.modelMatrix * vec4(tangent.xyz, 0.0)));
  vec3 bitangentW = cross(normalW, tangentW) * tangent.w;
  pbr_vTBN = mat3(tangentW, bitangentW, normalW);
#else // HAS_TANGENTS != 1
  pbr_vNormal = normalize(vec3(pbrProjection.modelMatrix * vec4(normal.xyz, 0.0)));
#endif
#endif

#ifdef HAS_UV
  pbr_vUV0 = uv0;
#else
  pbr_vUV0 = vec2(0.,0.);
#endif

  pbr_vUV1 = uv1;
}
`,Xx=`precision highp float;

layout(std140) uniform pbrMaterialUniforms {
  // Material is unlit
  bool unlit;

  // Base color map
  bool baseColorMapEnabled;
  vec4 baseColorFactor;

  bool normalMapEnabled;  
  float normalScale; // #ifdef HAS_NORMALMAP

  bool emissiveMapEnabled;
  vec3 emissiveFactor; // #ifdef HAS_EMISSIVEMAP

  vec2 metallicRoughnessValues;
  bool metallicRoughnessMapEnabled;

  bool occlusionMapEnabled;
  float occlusionStrength; // #ifdef HAS_OCCLUSIONMAP
  
  bool alphaCutoffEnabled;
  float alphaCutoff; // #ifdef ALPHA_CUTOFF

  vec3 specularColorFactor;
  float specularIntensityFactor;
  bool specularColorMapEnabled;
  bool specularIntensityMapEnabled;

  float ior;

  float transmissionFactor;
  bool transmissionMapEnabled;

  float thicknessFactor;
  float attenuationDistance;
  vec3 attenuationColor;

  float clearcoatFactor;
  float clearcoatRoughnessFactor;
  bool clearcoatMapEnabled;
  bool clearcoatRoughnessMapEnabled;

  vec3 sheenColorFactor;
  float sheenRoughnessFactor;
  bool sheenColorMapEnabled;
  bool sheenRoughnessMapEnabled;

  float iridescenceFactor;
  float iridescenceIor;
  vec2 iridescenceThicknessRange;
  bool iridescenceMapEnabled;

  float anisotropyStrength;
  float anisotropyRotation;
  vec2 anisotropyDirection;
  bool anisotropyMapEnabled;

  float emissiveStrength;
  float dispersion;
  
  // IBL
  bool IBLenabled;
  vec2 scaleIBLAmbient; // #ifdef USE_IBL
  
  // debugging flags used for shader output of intermediate PBR variables
  // #ifdef PBR_DEBUG
  vec4 scaleDiffBaseMR;
  vec4 scaleFGDSpec;
  // #endif

  int baseColorUVSet;
  mat3 baseColorUVTransform;
  int metallicRoughnessUVSet;
  mat3 metallicRoughnessUVTransform;
  int normalUVSet;
  mat3 normalUVTransform;
  int occlusionUVSet;
  mat3 occlusionUVTransform;
  int emissiveUVSet;
  mat3 emissiveUVTransform;
  int specularColorUVSet;
  mat3 specularColorUVTransform;
  int specularIntensityUVSet;
  mat3 specularIntensityUVTransform;
  int transmissionUVSet;
  mat3 transmissionUVTransform;
  int thicknessUVSet;
  mat3 thicknessUVTransform;
  int clearcoatUVSet;
  mat3 clearcoatUVTransform;
  int clearcoatRoughnessUVSet;
  mat3 clearcoatRoughnessUVTransform;
  int clearcoatNormalUVSet;
  mat3 clearcoatNormalUVTransform;
  int sheenColorUVSet;
  mat3 sheenColorUVTransform;
  int sheenRoughnessUVSet;
  mat3 sheenRoughnessUVTransform;
  int iridescenceUVSet;
  mat3 iridescenceUVTransform;
  int iridescenceThicknessUVSet;
  mat3 iridescenceThicknessUVTransform;
  int anisotropyUVSet;
  mat3 anisotropyUVTransform;

  float bumpFactor;
  bool bumpMapEnabled;
  float diffuseTransmissionFactor;
  bool diffuseTransmissionMapEnabled;
  vec3 diffuseTransmissionColorFactor;
  bool diffuseTransmissionColorMapEnabled;
  vec3 multiscatterColorFactor;
  bool multiscatterColorMapEnabled;
  float scatterAnisotropy;

  int bumpUVSet;
  mat3 bumpUVTransform;
  int diffuseTransmissionUVSet;
  mat3 diffuseTransmissionUVTransform;
  int diffuseTransmissionColorUVSet;
  mat3 diffuseTransmissionColorUVTransform;
  int multiscatterColorUVSet;
  mat3 multiscatterColorUVTransform;
} pbrMaterial;

// Samplers
#ifdef HAS_BASECOLORMAP
uniform sampler2D pbr_baseColorSampler;
#endif
#ifdef HAS_NORMALMAP
uniform sampler2D pbr_normalSampler;
#endif
#ifdef HAS_EMISSIVEMAP
uniform sampler2D pbr_emissiveSampler;
#endif
#ifdef HAS_METALROUGHNESSMAP
uniform sampler2D pbr_metallicRoughnessSampler;
#endif
#ifdef HAS_OCCLUSIONMAP
uniform sampler2D pbr_occlusionSampler;
#endif
#ifdef HAS_SPECULARCOLORMAP
uniform sampler2D pbr_specularColorSampler;
#endif
#ifdef HAS_SPECULARINTENSITYMAP
uniform sampler2D pbr_specularIntensitySampler;
#endif
#ifdef HAS_TRANSMISSIONMAP
uniform sampler2D pbr_transmissionSampler;
#endif
#ifdef HAS_THICKNESSMAP
uniform sampler2D pbr_thicknessSampler;
#endif
#ifdef HAS_CLEARCOATMAP
uniform sampler2D pbr_clearcoatSampler;
#endif
#ifdef HAS_CLEARCOATROUGHNESSMAP
uniform sampler2D pbr_clearcoatRoughnessSampler;
#endif
#ifdef HAS_CLEARCOATNORMALMAP
uniform sampler2D pbr_clearcoatNormalSampler;
#endif
#ifdef HAS_SHEENCOLORMAP
uniform sampler2D pbr_sheenColorSampler;
#endif
#ifdef HAS_SHEENROUGHNESSMAP
uniform sampler2D pbr_sheenRoughnessSampler;
#endif
#ifdef HAS_IRIDESCENCEMAP
uniform sampler2D pbr_iridescenceSampler;
#endif
#ifdef HAS_IRIDESCENCETHICKNESSMAP
uniform sampler2D pbr_iridescenceThicknessSampler;
#endif
#ifdef HAS_ANISOTROPYMAP
uniform sampler2D pbr_anisotropySampler;
#endif
#ifdef HAS_BUMPMAP
uniform sampler2D pbr_bumpSampler;
#endif
#ifdef HAS_DIFFUSETRANSMISSIONMAP
uniform sampler2D pbr_diffuseTransmissionSampler;
#endif
#ifdef HAS_DIFFUSETRANSMISSIONCOLORMAP
uniform sampler2D pbr_diffuseTransmissionColorSampler;
#endif
#ifdef HAS_MULTISCATTERCOLORMAP
uniform sampler2D pbr_multiscatterColorSampler;
#endif
// Inputs from vertex shader

in vec3 pbr_vPosition;
in vec2 pbr_vUV0;
in vec2 pbr_vUV1;

#ifdef HAS_NORMALS
#ifdef HAS_TANGENTS
in mat3 pbr_vTBN;
#else
in vec3 pbr_vNormal;
#endif
#endif

// Encapsulate the various inputs used by the various functions in the shading equation
// We store values in this struct to simplify the integration of alternative implementations
// of the shading terms, outlined in the Readme.MD Appendix.
struct PBRInfo {
  float NdotL;                  // cos angle between normal and light direction
  float NdotV;                  // cos angle between normal and view direction
  float NdotH;                  // cos angle between normal and half vector
  float LdotH;                  // cos angle between light direction and half vector
  float VdotH;                  // cos angle between view direction and half vector
  float perceptualRoughness;    // roughness value, as authored by the model creator (input to shader)
  float metalness;              // metallic value at the surface
  vec3 reflectance0;            // full reflectance color (normal incidence angle)
  vec3 reflectance90;           // reflectance color at grazing angle
  float alphaRoughness;         // roughness mapped to a more linear change in the roughness (proposed by [2])
  vec3 diffuseColor;            // color contribution from diffuse lighting
  vec3 specularColor;           // color contribution from specular lighting
  vec3 n;                       // normal at surface point
  vec3 v;                       // vector from surface point to camera
  vec3 l;                       // direction from the surface toward the current light
  vec3 h;                       // half vector between the current light and camera
};

const float M_PI = 3.141592653589793;
const float c_MinRoughness = 0.04;

// Widen sub-pixel specular lobes using the screen-space normal footprint.
// This is geometric specular antialiasing: the normal variance is converted
// into an additional squared perceptual roughness before evaluating BRDFs.
float widenSpecularRoughness(float perceptualRoughness, vec3 normal)
{
  vec3 normalDerivativeX = dFdx(normal);
  vec3 normalDerivativeY = dFdy(normal);
  float normalVariance =
    dot(normalDerivativeX, normalDerivativeX) +
    dot(normalDerivativeY, normalDerivativeY);
  float kernelRoughnessSquared = min(2.0 * normalVariance, 1.0);
  return clamp(
    sqrt(perceptualRoughness * perceptualRoughness + kernelRoughnessSquared),
    c_MinRoughness,
    1.0
  );
}

vec3 calculateFinalColor(PBRInfo pbrInfo, vec3 lightColor);

vec4 SRGBtoLINEAR(vec4 srgbIn)
{
#ifdef MANUAL_SRGB
#ifdef SRGB_FAST_APPROXIMATION
  vec3 linOut = pow(srgbIn.xyz,vec3(2.2));
#else // SRGB_FAST_APPROXIMATION
  vec3 bLess = step(vec3(0.04045),srgbIn.xyz);
  vec3 linOut = mix( srgbIn.xyz/vec3(12.92), pow((srgbIn.xyz+vec3(0.055))/vec3(1.055),vec3(2.4)), bLess );
#endif //SRGB_FAST_APPROXIMATION
  return vec4(linOut,srgbIn.w);;
#else //MANUAL_SRGB
  return srgbIn;
#endif //MANUAL_SRGB
}

vec2 getMaterialUV(int uvSet, mat3 uvTransform)
{
  vec2 baseUV = uvSet == 1 ? pbr_vUV1 : pbr_vUV0;
  return (uvTransform * vec3(baseUV, 1.0)).xy;
}

// Build the tangent basis from interpolated attributes or screen-space derivatives.
mat3 getTBN(vec2 uv)
{
#ifndef HAS_TANGENTS
  vec3 pos_dx = dFdx(pbr_vPosition);
  vec3 pos_dy = dFdy(pbr_vPosition);
  vec3 tex_dx = dFdx(vec3(uv, 0.0));
  vec3 tex_dy = dFdy(vec3(uv, 0.0));
  vec3 t = (tex_dy.t * pos_dx - tex_dx.t * pos_dy) / (tex_dx.s * tex_dy.t - tex_dy.s * tex_dx.t);

#ifdef HAS_NORMALS
  vec3 ng = normalize(pbr_vNormal);
#else
  vec3 ng = cross(pos_dx, pos_dy);
#endif

  t = normalize(t - ng * dot(ng, t));
  vec3 b = normalize(cross(ng, t));
  mat3 tbn = mat3(t, b, ng);
#else // HAS_TANGENTS
  mat3 tbn = pbr_vTBN;
#endif

  return tbn;
}

// Find the normal for this fragment, pulling either from a predefined normal map
// or from the interpolated mesh normal and tangent attributes.
vec3 getMappedNormal(sampler2D normalSampler, mat3 tbn, float normalScale, vec2 uv)
{
  vec3 n = texture(normalSampler, uv).rgb;
  return normalize(tbn * ((2.0 * n - 1.0) * vec3(normalScale, normalScale, 1.0)));
}

vec3 getNormal(mat3 tbn, vec2 uv)
{
#ifdef HAS_NORMALMAP
  vec3 n = getMappedNormal(pbr_normalSampler, tbn, pbrMaterial.normalScale, uv);
#else
  // The tbn matrix is linearly interpolated, so we need to re-normalize
  vec3 n = normalize(tbn[2].xyz);
#endif

#ifdef HAS_BUMPMAP
  vec2 bumpUV = getMaterialUV(pbrMaterial.bumpUVSet, pbrMaterial.bumpUVTransform);
  vec2 bumpTexelSize = 1.0 / vec2(textureSize(pbr_bumpSampler, 0));
  float bumpHeight = texture(pbr_bumpSampler, bumpUV).r;
  vec2 bumpGradient = vec2(
    texture(pbr_bumpSampler, bumpUV + vec2(bumpTexelSize.x, 0.0)).r - bumpHeight,
    texture(pbr_bumpSampler, bumpUV + vec2(0.0, bumpTexelSize.y)).r - bumpHeight
  );
  n = normalize(n - pbrMaterial.bumpFactor *
    (tbn[0] * bumpGradient.x + tbn[1] * bumpGradient.y));
#endif

  return n;
}

vec3 getClearcoatNormal(mat3 tbn, vec3 baseNormal, vec2 uv)
{
#ifdef HAS_CLEARCOATNORMALMAP
  return getMappedNormal(pbr_clearcoatNormalSampler, tbn, 1.0, uv);
#else
  return baseNormal;
#endif
}

// Calculation of the lighting contribution from an optional Image Based Light source.
// Precomputed Environment Maps are required uniform inputs and are computed as outlined in [1].
// See our README.md on Environment Maps [3] for additional discussion.
#ifdef USE_IBL
vec3 getIBLContribution(PBRInfo pbrInfo, vec3 n, vec3 reflection)
{
#ifdef USE_SCENE_ENVIRONMENT
  float maximumMipLevel = max(pbrScene.environmentMipCount - 1.0, 0.0);
  float rotationSine = sin(pbrScene.environmentRotation);
  float rotationCosine = cos(pbrScene.environmentRotation);
  mat2 environmentRotation = mat2(rotationCosine, rotationSine, -rotationSine, rotationCosine);
  vec3 environmentNormal = vec3(environmentRotation * n.xz, n.y).xzy;
  vec3 environmentReflection = vec3(environmentRotation * reflection.xz, reflection.y).xzy;
#else
  float maximumMipLevel = 9.0;
  vec3 environmentNormal = n;
  vec3 environmentReflection = reflection;
#endif
  float lod = pbrInfo.perceptualRoughness * maximumMipLevel;
  // retrieve a scale and bias to F0. See [1], Figure 3
  vec4 brdfSample = texture(pbr_brdfLUT,
    vec2(pbrInfo.NdotV, 1.0 - pbrInfo.perceptualRoughness));
  vec4 diffuseSample = texture(pbr_diffuseEnvSampler, environmentNormal);

#ifdef USE_TEX_LOD
  vec4 specularSample = textureLod(pbr_specularEnvSampler, environmentReflection, lod);
#else
  vec4 specularSample = texture(pbr_specularEnvSampler, environmentReflection);
#endif

#ifdef USE_SCENE_ENVIRONMENT
  vec3 brdf = brdfSample.rgb;
  vec3 diffuseLight = diffuseSample.rgb;
  vec3 specularLight = specularSample.rgb;
#else
  vec3 brdf = SRGBtoLINEAR(brdfSample).rgb;
  vec3 diffuseLight = SRGBtoLINEAR(diffuseSample).rgb;
  vec3 specularLight = SRGBtoLINEAR(specularSample).rgb;
#endif

  vec3 diffuse = diffuseLight * pbrInfo.diffuseColor;
  vec3 specular = specularLight * (pbrInfo.specularColor * brdf.x + brdf.y);

  // For presentation, this allows us to disable IBL terms
  diffuse *= pbrMaterial.scaleIBLAmbient.x;
  specular *= pbrMaterial.scaleIBLAmbient.y;

#ifdef USE_SCENE_ENVIRONMENT
  return (diffuse + specular) * max(pbrScene.environmentIntensity, 0.0);
#else
  return diffuse + specular;
#endif
}
#endif

// Basic Lambertian diffuse
// Implementation from Lambert's Photometria https://archive.org/details/lambertsphotome00lambgoog
// See also [1], Equation 1
vec3 diffuse(PBRInfo pbrInfo)
{
  return pbrInfo.diffuseColor / M_PI;
}

// The following equation models the Fresnel reflectance term of the spec equation (aka F())
// Implementation of fresnel from [4], Equation 15
vec3 specularReflection(PBRInfo pbrInfo)
{
  return pbrInfo.reflectance0 +
    (pbrInfo.reflectance90 - pbrInfo.reflectance0) *
    pow(clamp(1.0 - pbrInfo.VdotH, 0.0, 1.0), 5.0);
}

// This calculates the specular geometric attenuation (aka G()),
// where rougher material will reflect less light back to the viewer.
// This implementation is based on [1] Equation 4, and we adopt their modifications to
// alphaRoughness as input as originally proposed in [2].
float geometricOcclusion(PBRInfo pbrInfo)
{
  float NdotL = pbrInfo.NdotL;
  float NdotV = pbrInfo.NdotV;
  float r = pbrInfo.alphaRoughness;

  float attenuationL = 2.0 * NdotL / (NdotL + sqrt(r * r + (1.0 - r * r) * (NdotL * NdotL)));
  float attenuationV = 2.0 * NdotV / (NdotV + sqrt(r * r + (1.0 - r * r) * (NdotV * NdotV)));
  return attenuationL * attenuationV;
}

// The following equation(s) model the distribution of microfacet normals across
// the area being drawn (aka D())
// Implementation from "Average Irregularity Representation of a Roughened Surface
// for Ray Reflection" by T. S. Trowbridge, and K. P. Reitz
// Follows the distribution function recommended in the SIGGRAPH 2013 course notes
// from EPIC Games [1], Equation 3.
float microfacetDistribution(PBRInfo pbrInfo)
{
  float roughnessSq = pbrInfo.alphaRoughness * pbrInfo.alphaRoughness;
  float f = (pbrInfo.NdotH * roughnessSq - pbrInfo.NdotH) * pbrInfo.NdotH + 1.0;
  return roughnessSq / (M_PI * f * f);
}

float maxComponent(vec3 value)
{
  return max(max(value.r, value.g), value.b);
}

float getDielectricF0(float ior)
{
  float clampedIor = max(ior, 1.0);
  float ratio = (clampedIor - 1.0) / (clampedIor + 1.0);
  return ratio * ratio;
}

vec2 normalizeDirection(vec2 direction)
{
  float directionLength = length(direction);
  return directionLength > 0.0001 ? direction / directionLength : vec2(1.0, 0.0);
}

vec2 rotateDirection(vec2 direction, float rotation)
{
  float s = sin(rotation);
  float c = cos(rotation);
  return vec2(direction.x * c - direction.y * s, direction.x * s + direction.y * c);
}

vec3 encodeLinearSRGB(vec3 linearColor)
{
  vec3 positiveColor = max(linearColor, vec3(0.0));
  return mix(
    positiveColor * 12.92,
    1.055 * pow(positiveColor, vec3(1.0 / 2.4)) - 0.055,
    greaterThan(positiveColor, vec3(0.0031308))
  );
}

vec3 toneMapKhronosPBRNeutral(vec3 color)
{
  const float startCompression = 0.76;
  float darkestChannel = min(color.r, min(color.g, color.b));
  float offset = darkestChannel < 0.08
    ? darkestChannel - 6.25 * darkestChannel * darkestChannel
    : 0.04;
  color -= vec3(offset);

  float peak = maxComponent(color);
  if (peak < startCompression) {
    return color;
  }

  float compressionRange = 1.0 - startCompression;
  float compressedPeak = 1.0 - compressionRange * compressionRange /
    (peak + compressionRange - startCompression);
  color *= compressedPeak / max(peak, 0.0001);
  float desaturation = 1.0 - 1.0 / (0.15 * (peak - compressedPeak) + 1.0);
  return mix(color, vec3(compressedPeak), desaturation);
}

vec3 applySceneColorManagement(vec3 sceneColor)
{
#ifdef USE_SCENE_COLOR_MANAGEMENT
  vec3 color = max(sceneColor, vec3(0.0)) * max(pbrScene.exposure, 0.0);
  if (pbrScene.toneMapMode == 1) {
    color /= vec3(1.0) + color;
  } else if (pbrScene.toneMapMode == 2) {
    color = toneMapKhronosPBRNeutral(color);
  } else if (pbrScene.toneMapMode == 3) {
    color = clamp(
      (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14),
      vec3(0.0),
      vec3(1.0)
    );
  }
  return pbrScene.outputEncoding == 0 ? color : encodeLinearSRGB(color);
#else
  return pow(max(sceneColor, vec3(0.0)), vec3(1.0 / 2.2));
#endif
}

float dielectricSchlick(float reflectance, float cosine)
{
  return reflectance + (1.0 - reflectance) * pow(clamp(1.0 - cosine, 0.0, 1.0), 5.0);
}

vec3 evaluateIridescenceSensitivity(float opticalPathDifference, vec3 phaseShift)
{
  float phase = 2.0 * M_PI * opticalPathDifference * 1.0e-9;
  vec3 sensitivity = vec3(5.4856e-13, 4.4201e-13, 5.2481e-13);
  vec3 position = vec3(1.6810e6, 1.7953e6, 2.2084e6);
  vec3 variance = vec3(4.3278e9, 9.3046e9, 6.6121e9);
  vec3 xyz = sensitivity * sqrt(2.0 * M_PI * variance) *
    cos(position * phase + phaseShift) * exp(-phase * phase * variance);
  xyz.x += 9.7470e-14 * sqrt(2.0 * M_PI * 4.5282e9) *
    cos(2.2399e6 * phase + phaseShift.x) * exp(-4.5282e9 * phase * phase);
  xyz /= 1.0685e-7;
  return mat3(
    3.2404542, -0.9692660, 0.0556434,
    -1.5371385, 1.8760108, -0.2040259,
    -0.4985314, 0.0415560, 1.0572252
  ) * xyz;
}

vec3 getIridescenceTint(float iridescence, float thickness, float NdotV, vec3 baseReflectance)
{
  if (iridescence <= 0.0 || thickness <= 0.0) {
    return baseReflectance;
  }

  float filmIor = max(pbrMaterial.iridescenceIor, 1.0);
  float sineSquared = (1.0 - NdotV * NdotV) / (filmIor * filmIor);
  float cosineSquared = 1.0 - sineSquared;
  if (cosineSquared <= 0.0) {
    return mix(baseReflectance, vec3(1.0), iridescence);
  }
  float filmCosine = sqrt(cosineSquared);
  float firstInterfaceReflectance = dielectricSchlick(getDielectricF0(filmIor), NdotV);
  float transmittedEnergy = 1.0 - firstInterfaceReflectance;

  vec3 baseIor = (vec3(1.0) + sqrt(clamp(baseReflectance, vec3(0.0), vec3(0.9999)))) /
    (vec3(1.0) - sqrt(clamp(baseReflectance, vec3(0.0), vec3(0.9999))));
  vec3 secondInterfaceF0 = (baseIor - vec3(filmIor)) / (baseIor + vec3(filmIor));
  secondInterfaceF0 *= secondInterfaceF0;
  vec3 secondInterfaceReflectance = secondInterfaceF0 +
    (vec3(1.0) - secondInterfaceF0) * pow(1.0 - filmCosine, 5.0);
  vec3 phaseShift = vec3(M_PI);
  phaseShift += mix(vec3(0.0), vec3(M_PI), lessThan(baseIor, vec3(filmIor)));
  float opticalPathDifference = 2.0 * filmIor * thickness * filmCosine;
  vec3 combinedReflectance = clamp(
    firstInterfaceReflectance * secondInterfaceReflectance,
    vec3(0.00001),
    vec3(0.9999)
  );
  vec3 recurringAmplitude = sqrt(combinedReflectance);
  vec3 interfaceResponse = transmittedEnergy * transmittedEnergy * secondInterfaceReflectance /
    (vec3(1.0) - combinedReflectance);
  vec3 reflectedSpectrum = vec3(firstInterfaceReflectance) + interfaceResponse;
  vec3 harmonicAmplitude = interfaceResponse - vec3(transmittedEnergy);
  for (int harmonic = 1; harmonic <= 2; harmonic++) {
    harmonicAmplitude *= recurringAmplitude;
    reflectedSpectrum += harmonicAmplitude * 2.0 * evaluateIridescenceSensitivity(
      float(harmonic) * opticalPathDifference,
      float(harmonic) * phaseShift
    );
  }
  return mix(baseReflectance, clamp(reflectedSpectrum, vec3(0.0), vec3(1.0)), iridescence);
}

vec3 getVolumeAttenuation(float thickness)
{
  if (thickness <= 0.0) {
    return vec3(1.0);
  }

  vec3 attenuationCoefficient =
    -log(max(pbrMaterial.attenuationColor, vec3(0.0001))) /
    max(pbrMaterial.attenuationDistance, 0.0001);
  return exp(-attenuationCoefficient * thickness);
}

// KHR_materials_volume_scatter is an active draft. This evaluates a local,
// thickness-aware single-scattering approximation rather than random walk.
vec3 getDiffuseTransmissionAttenuation(
  PBRInfo pbrInfo,
  vec3 multiscatterColor,
  float thickness
)
{
  vec3 volumeAttenuation = getVolumeAttenuation(thickness);
  float scatteringStrength = maxComponent(multiscatterColor);
  if (thickness <= 0.0 || scatteringStrength <= 0.0001) {
    return volumeAttenuation;
  }

  float anisotropy = clamp(pbrMaterial.scatterAnisotropy, -0.95, 0.95);
  float scatteringCosine = clamp(dot(-pbrInfo.v, pbrInfo.l), -1.0, 1.0);
  float phaseDenominator = max(
    1.0 + anisotropy * anisotropy - 2.0 * anisotropy * scatteringCosine,
    0.0001
  );
  float phaseWeight = clamp(
    (1.0 - anisotropy * anisotropy) / pow(phaseDenominator, 1.5),
    0.0,
    4.0
  );
  float scatteringDepth = thickness / max(pbrMaterial.attenuationDistance, 0.0001);
  float scatteringProbability = 1.0 - exp(-scatteringDepth);
  vec3 scatteringColor = clamp(multiscatterColor, vec3(0.0), vec3(1.0));
  return mix(
    volumeAttenuation,
    volumeAttenuation * mix(vec3(1.0), scatteringColor * phaseWeight, scatteringColor),
    scatteringProbability
  );
}

vec3 calculateDiffuseTransmissionLight(
  PBRInfo pbrInfo,
  vec3 lightColor,
  vec3 diffuseTransmissionColor,
  float diffuseTransmission,
  vec3 multiscatterColor,
  float thickness
)
{
  float oppositeHemisphere = max(dot(-pbrInfo.n, pbrInfo.l), 0.0);
  if (oppositeHemisphere <= 0.0 || diffuseTransmission <= 0.0) {
    return vec3(0.0);
  }

  vec3 nonReflectedEnergy = vec3(1.0) - clamp(pbrInfo.reflectance0, vec3(0.0), vec3(1.0));
  vec3 attenuatedColor = getDiffuseTransmissionAttenuation(
    pbrInfo,
    multiscatterColor,
    thickness
  );
  return lightColor * diffuseTransmissionColor * nonReflectedEnergy *
    attenuatedColor * (diffuseTransmission * oppositeHemisphere / M_PI);
}

#ifdef USE_IBL
vec3 calculateDiffuseTransmissionIBL(
  PBRInfo pbrInfo,
  vec3 diffuseTransmissionColor,
  float diffuseTransmission,
  vec3 multiscatterColor,
  float thickness
)
{
  if (diffuseTransmission <= 0.0) {
    return vec3(0.0);
  }

#ifdef USE_SCENE_ENVIRONMENT
  float rotationSine = sin(pbrScene.environmentRotation);
  float rotationCosine = cos(pbrScene.environmentRotation);
  mat2 environmentRotation = mat2(rotationCosine, rotationSine, -rotationSine, rotationCosine);
  vec3 oppositeNormal = vec3(environmentRotation * -pbrInfo.n.xz, -pbrInfo.n.y).xzy;
  vec3 environmentColor = texture(pbr_diffuseEnvSampler, oppositeNormal).rgb *
    max(pbrScene.environmentIntensity, 0.0);
#else
  vec3 environmentColor = SRGBtoLINEAR(texture(pbr_diffuseEnvSampler, -pbrInfo.n)).rgb;
#endif
  vec3 nonReflectedEnergy = vec3(1.0) - clamp(pbrInfo.reflectance0, vec3(0.0), vec3(1.0));
  return environmentColor * diffuseTransmissionColor * nonReflectedEnergy *
    getDiffuseTransmissionAttenuation(pbrInfo, multiscatterColor, thickness) *
    diffuseTransmission * pbrMaterial.scaleIBLAmbient.x;
}
#endif

#ifdef USE_TRANSMISSION_FRAMEBUFFER
vec3 sampleTransmittedSceneColor(
  vec3 position,
  vec3 normal,
  vec3 viewDirection,
  float thickness,
  float perceptualRoughness,
  float indexOfRefraction
)
{
  vec3 refractionDirection = refract(
    -viewDirection,
    normal,
    1.0 / max(indexOfRefraction, 1.0)
  );
  vec3 refractedPosition = position + refractionDirection * thickness;
  vec4 clipPosition = pbrScene.projectionMatrix *
    pbrScene.viewMatrix * vec4(refractedPosition, 1.0);
  vec2 textureCoordinate = clipPosition.xy / max(clipPosition.w, 0.0001) * 0.5 + 0.5;
  textureCoordinate = clamp(textureCoordinate, vec2(0.001), vec2(0.999));

  vec2 blurRadius = perceptualRoughness * perceptualRoughness * 8.0 /
    max(pbrScene.framebufferSize, vec2(1.0));
  vec3 sceneColor = texture(pbr_transmissionFramebufferSampler, textureCoordinate).rgb * 0.4;
  sceneColor += texture(
    pbr_transmissionFramebufferSampler,
    textureCoordinate + vec2(blurRadius.x, 0.0)
  ).rgb * 0.15;
  sceneColor += texture(
    pbr_transmissionFramebufferSampler,
    textureCoordinate - vec2(blurRadius.x, 0.0)
  ).rgb * 0.15;
  sceneColor += texture(
    pbr_transmissionFramebufferSampler,
    textureCoordinate + vec2(0.0, blurRadius.y)
  ).rgb * 0.15;
  sceneColor += texture(
    pbr_transmissionFramebufferSampler,
    textureCoordinate - vec2(0.0, blurRadius.y)
  ).rgb * 0.15;
  return max(sceneColor, vec3(0.0));
}

vec3 getTransmittedSceneColor(
  vec3 position,
  vec3 normal,
  vec3 viewDirection,
  float thickness,
  float perceptualRoughness
)
{
  if (pbrMaterial.dispersion <= 0.0) {
    return sampleTransmittedSceneColor(
      position,
      normal,
      viewDirection,
      thickness,
      perceptualRoughness,
      pbrMaterial.ior
    );
  }

  float halfSpread = (max(pbrMaterial.ior, 1.0) - 1.0) * 0.025 * pbrMaterial.dispersion;
  vec3 indicesOfRefraction = max(
    vec3(pbrMaterial.ior - halfSpread, pbrMaterial.ior, pbrMaterial.ior + halfSpread),
    vec3(1.0)
  );
  return vec3(
    sampleTransmittedSceneColor(
      position, normal, viewDirection, thickness, perceptualRoughness, indicesOfRefraction.r
    ).r,
    sampleTransmittedSceneColor(
      position, normal, viewDirection, thickness, perceptualRoughness, indicesOfRefraction.g
    ).g,
    sampleTransmittedSceneColor(
      position, normal, viewDirection, thickness, perceptualRoughness, indicesOfRefraction.b
    ).b
  );
}
#endif

PBRInfo createClearcoatPBRInfo(PBRInfo basePBRInfo, vec3 clearcoatNormal, float clearcoatRoughness)
{
  float perceptualRoughness = clamp(clearcoatRoughness, c_MinRoughness, 1.0);
  float alphaRoughness = perceptualRoughness * perceptualRoughness;
  float NdotV = clamp(abs(dot(clearcoatNormal, basePBRInfo.v)), 0.001, 1.0);

  return PBRInfo(
    basePBRInfo.NdotL,
    NdotV,
    basePBRInfo.NdotH,
    basePBRInfo.LdotH,
    basePBRInfo.VdotH,
    perceptualRoughness,
    0.0,
    vec3(0.04),
    vec3(1.0),
    alphaRoughness,
    vec3(0.0),
    vec3(0.04),
    clearcoatNormal,
    basePBRInfo.v,
    basePBRInfo.l,
    basePBRInfo.h
  );
}

vec3 calculateClearcoatContribution(
  PBRInfo pbrInfo,
  vec3 lightColor,
  vec3 clearcoatNormal,
  float clearcoatFactor,
  float clearcoatRoughness
) {
  if (clearcoatFactor <= 0.0) {
    return vec3(0.0);
  }

  PBRInfo clearcoatPBRInfo = createClearcoatPBRInfo(pbrInfo, clearcoatNormal, clearcoatRoughness);
  return calculateFinalColor(clearcoatPBRInfo, lightColor) * clearcoatFactor;
}

#ifdef USE_IBL
vec3 calculateClearcoatIBLContribution(
  PBRInfo pbrInfo,
  vec3 clearcoatNormal,
  vec3 reflection,
  float clearcoatFactor,
  float clearcoatRoughness
) {
  if (clearcoatFactor <= 0.0) {
    return vec3(0.0);
  }

  PBRInfo clearcoatPBRInfo = createClearcoatPBRInfo(pbrInfo, clearcoatNormal, clearcoatRoughness);
  return getIBLContribution(clearcoatPBRInfo, clearcoatNormal, reflection) * clearcoatFactor;
}
#endif

vec3 calculateSheenContribution(
  PBRInfo pbrInfo,
  vec3 lightColor,
  vec3 sheenColor,
  float sheenRoughness
) {
  if (maxComponent(sheenColor) <= 0.0) {
    return vec3(0.0);
  }

  float alpha = max(sheenRoughness * sheenRoughness, 0.0001);
  float inverseAlpha = 1.0 / alpha;
  float sineSquared = max(1.0 - pbrInfo.NdotH * pbrInfo.NdotH, 0.0);
  float distribution = (2.0 + inverseAlpha) * pow(sineSquared, inverseAlpha * 0.5) /
    (2.0 * M_PI);
  float visibility = 1.0 / max(
    4.0 * (pbrInfo.NdotL + pbrInfo.NdotV - pbrInfo.NdotL * pbrInfo.NdotV),
    0.0001
  );
  return pbrInfo.NdotL * lightColor * sheenColor * distribution * visibility *
    (1.0 - pbrInfo.metalness);
}

vec3 calculateAnisotropicLightColor(
  PBRInfo pbrInfo,
  vec3 lightColor,
  vec3 anisotropyTangent,
  float anisotropyStrength
) {
  if (anisotropyStrength <= 0.0) {
    return calculateFinalColor(pbrInfo, lightColor);
  }

  vec3 anisotropyBitangent = normalize(cross(pbrInfo.n, anisotropyTangent));
  float tangentRoughness = mix(
    pbrInfo.alphaRoughness,
    1.0,
    anisotropyStrength * anisotropyStrength
  );
  float bitangentRoughness = clamp(pbrInfo.alphaRoughness, 0.001, 1.0);
  float roughnessProduct = tangentRoughness * bitangentRoughness;
  vec3 distributionVector = vec3(
    bitangentRoughness * dot(anisotropyTangent, pbrInfo.h),
    tangentRoughness * dot(anisotropyBitangent, pbrInfo.h),
    roughnessProduct * pbrInfo.NdotH
  );
  float distributionFactor = roughnessProduct /
    max(dot(distributionVector, distributionVector), 0.000001);
  float distribution = roughnessProduct * distributionFactor * distributionFactor / M_PI;
  float viewMask = pbrInfo.NdotL * length(vec3(
    tangentRoughness * dot(anisotropyTangent, pbrInfo.v),
    bitangentRoughness * dot(anisotropyBitangent, pbrInfo.v),
    pbrInfo.NdotV
  ));
  float lightMask = pbrInfo.NdotV * length(vec3(
    tangentRoughness * dot(anisotropyTangent, pbrInfo.l),
    bitangentRoughness * dot(anisotropyBitangent, pbrInfo.l),
    pbrInfo.NdotL
  ));
  float visibility = clamp(0.5 / max(viewMask + lightMask, 0.000001), 0.0, 1.0);
  vec3 fresnel = specularReflection(pbrInfo);
  vec3 diffuseContribution = (vec3(1.0) - fresnel) * diffuse(pbrInfo);
  return pbrInfo.NdotL * lightColor *
    (diffuseContribution + fresnel * distribution * visibility);
}

vec3 getAnisotropicReflection(PBRInfo pbrInfo, vec3 anisotropyTangent, float anisotropyStrength)
{
  if (anisotropyStrength <= 0.0) {
    return -normalize(reflect(pbrInfo.v, pbrInfo.n));
  }
  vec3 anisotropyBitangent = normalize(cross(pbrInfo.n, anisotropyTangent));
  vec3 anisotropicNormal = normalize(cross(anisotropyBitangent, pbrInfo.v));
  anisotropicNormal = normalize(cross(anisotropicNormal, anisotropyBitangent));
  float bend = anisotropyStrength * (1.0 - pbrInfo.perceptualRoughness);
  return -normalize(reflect(pbrInfo.v, normalize(mix(pbrInfo.n, anisotropicNormal, bend))));
}

vec3 calculateMaterialLightColor(
  PBRInfo pbrInfo,
  vec3 lightColor,
  vec3 clearcoatNormal,
  float clearcoatFactor,
  float clearcoatRoughness,
  vec3 sheenColor,
  float sheenRoughness,
  vec3 anisotropyTangent,
  float anisotropyStrength
) {
  vec3 color = calculateAnisotropicLightColor(
    pbrInfo,
    lightColor,
    anisotropyTangent,
    anisotropyStrength
  );
  color += calculateClearcoatContribution(
    pbrInfo,
    lightColor,
    clearcoatNormal,
    clearcoatFactor,
    clearcoatRoughness
  );
  color += calculateSheenContribution(pbrInfo, lightColor, sheenColor, sheenRoughness);
  return color;
}

void PBRInfo_setAmbientLight(inout PBRInfo pbrInfo) {
  pbrInfo.NdotL = 1.0;
  pbrInfo.NdotH = 0.0;
  pbrInfo.LdotH = 0.0;
  pbrInfo.VdotH = 1.0;
  pbrInfo.l = pbrInfo.n;
  pbrInfo.h = pbrInfo.n;
}

void PBRInfo_setDirectionalLight(inout PBRInfo pbrInfo, vec3 lightDirection) {
  vec3 n = pbrInfo.n;
  vec3 v = pbrInfo.v;
  vec3 l = normalize(lightDirection);             // Vector from surface point to light
  vec3 h = normalize(l+v);                        // Half vector between both l and v

  pbrInfo.NdotL = clamp(dot(n, l), 0.001, 1.0);
  pbrInfo.NdotH = clamp(dot(n, h), 0.0, 1.0);
  pbrInfo.LdotH = clamp(dot(l, h), 0.0, 1.0);
  pbrInfo.VdotH = clamp(dot(v, h), 0.0, 1.0);
  pbrInfo.l = l;
  pbrInfo.h = h;
}

void PBRInfo_setPointLight(inout PBRInfo pbrInfo, PointLight pointLight) {
  vec3 light_direction = normalize(pointLight.position - pbr_vPosition);
  PBRInfo_setDirectionalLight(pbrInfo, light_direction);
}

void PBRInfo_setSpotLight(inout PBRInfo pbrInfo, SpotLight spotLight) {
  vec3 light_direction = normalize(spotLight.position - pbr_vPosition);
  PBRInfo_setDirectionalLight(pbrInfo, light_direction);
}

vec3 calculateFinalColor(PBRInfo pbrInfo, vec3 lightColor) {
  // Calculate the shading terms for the microfacet specular shading model
  vec3 F = specularReflection(pbrInfo);
  float G = geometricOcclusion(pbrInfo);
  float D = microfacetDistribution(pbrInfo);

  // Calculation of analytical lighting contribution
  vec3 diffuseContrib = (1.0 - F) * diffuse(pbrInfo);
  vec3 specContrib = F * G * D / (4.0 * pbrInfo.NdotL * pbrInfo.NdotV);
  // Obtain final intensity as reflectance (BRDF) scaled by the energy of the light (cosine law)
  return pbrInfo.NdotL * lightColor * (diffuseContrib + specContrib);
}

vec4 pbr_filterColor(vec4 vertexColor)
{
  vec2 baseColorUV = getMaterialUV(pbrMaterial.baseColorUVSet, pbrMaterial.baseColorUVTransform);
  vec2 metallicRoughnessUV = getMaterialUV(
    pbrMaterial.metallicRoughnessUVSet,
    pbrMaterial.metallicRoughnessUVTransform
  );
  vec2 normalUV = getMaterialUV(pbrMaterial.normalUVSet, pbrMaterial.normalUVTransform);
  vec2 occlusionUV = getMaterialUV(pbrMaterial.occlusionUVSet, pbrMaterial.occlusionUVTransform);
  vec2 emissiveUV = getMaterialUV(pbrMaterial.emissiveUVSet, pbrMaterial.emissiveUVTransform);
  vec2 specularColorUV = getMaterialUV(
    pbrMaterial.specularColorUVSet,
    pbrMaterial.specularColorUVTransform
  );
  vec2 specularIntensityUV = getMaterialUV(
    pbrMaterial.specularIntensityUVSet,
    pbrMaterial.specularIntensityUVTransform
  );
  vec2 transmissionUV = getMaterialUV(
    pbrMaterial.transmissionUVSet,
    pbrMaterial.transmissionUVTransform
  );
  vec2 thicknessUV = getMaterialUV(pbrMaterial.thicknessUVSet, pbrMaterial.thicknessUVTransform);
  vec2 clearcoatUV = getMaterialUV(pbrMaterial.clearcoatUVSet, pbrMaterial.clearcoatUVTransform);
  vec2 clearcoatRoughnessUV = getMaterialUV(
    pbrMaterial.clearcoatRoughnessUVSet,
    pbrMaterial.clearcoatRoughnessUVTransform
  );
  vec2 clearcoatNormalUV = getMaterialUV(
    pbrMaterial.clearcoatNormalUVSet,
    pbrMaterial.clearcoatNormalUVTransform
  );
  vec2 sheenColorUV = getMaterialUV(
    pbrMaterial.sheenColorUVSet,
    pbrMaterial.sheenColorUVTransform
  );
  vec2 sheenRoughnessUV = getMaterialUV(
    pbrMaterial.sheenRoughnessUVSet,
    pbrMaterial.sheenRoughnessUVTransform
  );
  vec2 iridescenceUV = getMaterialUV(
    pbrMaterial.iridescenceUVSet,
    pbrMaterial.iridescenceUVTransform
  );
  vec2 iridescenceThicknessUV = getMaterialUV(
    pbrMaterial.iridescenceThicknessUVSet,
    pbrMaterial.iridescenceThicknessUVTransform
  );
  vec2 anisotropyUV = getMaterialUV(
    pbrMaterial.anisotropyUVSet,
    pbrMaterial.anisotropyUVTransform
  );
  vec2 diffuseTransmissionUV = getMaterialUV(
    pbrMaterial.diffuseTransmissionUVSet,
    pbrMaterial.diffuseTransmissionUVTransform
  );
  vec2 diffuseTransmissionColorUV = getMaterialUV(
    pbrMaterial.diffuseTransmissionColorUVSet,
    pbrMaterial.diffuseTransmissionColorUVTransform
  );
  vec2 multiscatterColorUV = getMaterialUV(
    pbrMaterial.multiscatterColorUVSet,
    pbrMaterial.multiscatterColorUVTransform
  );

  // The albedo may be defined from a base texture or a flat color
#ifdef HAS_BASECOLORMAP
  vec4 baseColor =
    SRGBtoLINEAR(texture(pbr_baseColorSampler, baseColorUV)) *
    pbrMaterial.baseColorFactor * vertexColor;
#else
  vec4 baseColor = pbrMaterial.baseColorFactor * vertexColor;
#endif

#ifdef ALPHA_CUTOFF
  if (baseColor.a < pbrMaterial.alphaCutoff) {
    discard;
  }
#endif

  vec3 color = vec3(0, 0, 0);

  float transmission = 0.0;

  if(pbrMaterial.unlit){
    color.rgb = baseColor.rgb;
  }
  else{
    // Metallic and Roughness material properties are packed together
    // In glTF, these factors can be specified by fixed scalar values
    // or from a metallic-roughness map
    float perceptualRoughness = pbrMaterial.metallicRoughnessValues.y;
    float metallic = pbrMaterial.metallicRoughnessValues.x;
#ifdef HAS_METALROUGHNESSMAP
    // Roughness is stored in the 'g' channel, metallic is stored in the 'b' channel.
    // This layout intentionally reserves the 'r' channel for (optional) occlusion map data
    vec4 mrSample = texture(pbr_metallicRoughnessSampler, metallicRoughnessUV);
    perceptualRoughness = mrSample.g * perceptualRoughness;
    metallic = mrSample.b * metallic;
#endif
    perceptualRoughness = clamp(perceptualRoughness, c_MinRoughness, 1.0);
    metallic = clamp(metallic, 0.0, 1.0);
    mat3 tbn = getTBN(normalUV);
    vec3 n = getNormal(tbn, normalUV);                          // normal at surface point
    perceptualRoughness = widenSpecularRoughness(perceptualRoughness, n);
    vec3 v = normalize(pbrProjection.camera - pbr_vPosition);  // Vector from surface point to camera
    float NdotV = clamp(abs(dot(n, v)), 0.001, 1.0);
#ifdef USE_MATERIAL_EXTENSIONS
    bool useExtendedPBR =
      pbrMaterial.specularColorMapEnabled ||
      pbrMaterial.specularIntensityMapEnabled ||
      abs(pbrMaterial.specularIntensityFactor - 1.0) > 0.0001 ||
      maxComponent(abs(pbrMaterial.specularColorFactor - vec3(1.0))) > 0.0001 ||
      abs(pbrMaterial.ior - 1.5) > 0.0001 ||
      pbrMaterial.dispersion > 0.0001 ||
      pbrMaterial.transmissionMapEnabled ||
      pbrMaterial.transmissionFactor > 0.0001 ||
      pbrMaterial.diffuseTransmissionMapEnabled ||
      pbrMaterial.diffuseTransmissionColorMapEnabled ||
      pbrMaterial.diffuseTransmissionFactor > 0.0001 ||
      pbrMaterial.multiscatterColorMapEnabled ||
      maxComponent(pbrMaterial.multiscatterColorFactor) > 0.0001 ||
      pbrMaterial.clearcoatMapEnabled ||
      pbrMaterial.clearcoatRoughnessMapEnabled ||
      pbrMaterial.clearcoatFactor > 0.0001 ||
      pbrMaterial.clearcoatRoughnessFactor > 0.0001 ||
      pbrMaterial.sheenColorMapEnabled ||
      pbrMaterial.sheenRoughnessMapEnabled ||
      maxComponent(pbrMaterial.sheenColorFactor) > 0.0001 ||
      pbrMaterial.sheenRoughnessFactor > 0.0001 ||
      pbrMaterial.iridescenceMapEnabled ||
      pbrMaterial.iridescenceFactor > 0.0001 ||
      abs(pbrMaterial.iridescenceIor - 1.3) > 0.0001 ||
      abs(pbrMaterial.iridescenceThicknessRange.x - 100.0) > 0.0001 ||
      abs(pbrMaterial.iridescenceThicknessRange.y - 400.0) > 0.0001 ||
      pbrMaterial.anisotropyMapEnabled ||
      pbrMaterial.anisotropyStrength > 0.0001 ||
      abs(pbrMaterial.anisotropyRotation) > 0.0001 ||
      length(pbrMaterial.anisotropyDirection - vec2(1.0, 0.0)) > 0.0001;
#else
    bool useExtendedPBR = false;
#endif

    if (!useExtendedPBR) {
      // Keep the baseline metallic-roughness implementation byte-for-byte equivalent in behavior.
      float alphaRoughness = perceptualRoughness * perceptualRoughness;

      vec3 f0 = vec3(0.04);
      vec3 diffuseColor = baseColor.rgb * (vec3(1.0) - f0);
      diffuseColor *= 1.0 - metallic;
      vec3 specularColor = mix(f0, baseColor.rgb, metallic);

      float reflectance = max(max(specularColor.r, specularColor.g), specularColor.b);
      float reflectance90 = clamp(reflectance * 25.0, 0.0, 1.0);
      vec3 specularEnvironmentR0 = specularColor.rgb;
      vec3 specularEnvironmentR90 = vec3(1.0, 1.0, 1.0) * reflectance90;
      vec3 reflection = -normalize(reflect(v, n));

      PBRInfo pbrInfo = PBRInfo(
        0.0, // NdotL
        NdotV,
        0.0, // NdotH
        0.0, // LdotH
        0.0, // VdotH
        perceptualRoughness,
        metallic,
        specularEnvironmentR0,
        specularEnvironmentR90,
        alphaRoughness,
        diffuseColor,
        specularColor,
        n,
        v,
        n,
        n
      );

#ifdef USE_LIGHTS
      PBRInfo_setAmbientLight(pbrInfo);
      color += calculateFinalColor(pbrInfo, lighting.ambientColor);

      for(int i = 0; i < lighting.directionalLightCount; i++) {
        if (i < lighting.directionalLightCount) {
          PBRInfo_setDirectionalLight(pbrInfo, lighting_getDirectionalLight(i).direction);
          color += calculateFinalColor(pbrInfo, lighting_getDirectionalLight(i).color);
        }
      }

      for(int i = 0; i < lighting.pointLightCount; i++) {
        if (i < lighting.pointLightCount) {
          PBRInfo_setPointLight(pbrInfo, lighting_getPointLight(i));
          float attenuation = getPointLightAttenuation(lighting_getPointLight(i), distance(lighting_getPointLight(i).position, pbr_vPosition));
          color += calculateFinalColor(pbrInfo, lighting_getPointLight(i).color / attenuation);
        }
      }

      for(int i = 0; i < lighting.spotLightCount; i++) {
        if (i < lighting.spotLightCount) {
          PBRInfo_setSpotLight(pbrInfo, lighting_getSpotLight(i));
          float attenuation = getSpotLightAttenuation(lighting_getSpotLight(i), pbr_vPosition);
          color += calculateFinalColor(pbrInfo, lighting_getSpotLight(i).color / attenuation);
        }
      }
#endif

#ifdef USE_IBL
      if (pbrMaterial.IBLenabled) {
        color += getIBLContribution(pbrInfo, n, reflection);
      }
#endif

#ifdef HAS_OCCLUSIONMAP
      if (pbrMaterial.occlusionMapEnabled) {
        float ao = texture(pbr_occlusionSampler, occlusionUV).r;
        color = mix(color, color * ao, pbrMaterial.occlusionStrength);
      }
#endif

      vec3 emissive = pbrMaterial.emissiveFactor;
#ifdef HAS_EMISSIVEMAP
      if (pbrMaterial.emissiveMapEnabled) {
        emissive *= SRGBtoLINEAR(texture(pbr_emissiveSampler, emissiveUV)).rgb;
      }
#endif
      color += emissive * pbrMaterial.emissiveStrength;

#ifdef PBR_DEBUG
      color = mix(color, baseColor.rgb, pbrMaterial.scaleDiffBaseMR.y);
      color = mix(color, vec3(metallic), pbrMaterial.scaleDiffBaseMR.z);
      color = mix(color, vec3(perceptualRoughness), pbrMaterial.scaleDiffBaseMR.w);
#endif

      return vec4(applySceneColorManagement(color), baseColor.a);
    }

    float specularIntensity = pbrMaterial.specularIntensityFactor;
#ifdef HAS_SPECULARINTENSITYMAP
    if (pbrMaterial.specularIntensityMapEnabled) {
      specularIntensity *= texture(pbr_specularIntensitySampler, specularIntensityUV).a;
    }
#endif

    vec3 specularFactor = pbrMaterial.specularColorFactor;
#ifdef HAS_SPECULARCOLORMAP
    if (pbrMaterial.specularColorMapEnabled) {
      specularFactor *= SRGBtoLINEAR(texture(pbr_specularColorSampler, specularColorUV)).rgb;
    }
#endif

    transmission = pbrMaterial.transmissionFactor;
#ifdef HAS_TRANSMISSIONMAP
    if (pbrMaterial.transmissionMapEnabled) {
      transmission *= texture(pbr_transmissionSampler, transmissionUV).r;
    }
#endif
    transmission = clamp(transmission * (1.0 - metallic), 0.0, 1.0);
    float thickness = max(pbrMaterial.thicknessFactor, 0.0);
#ifdef HAS_THICKNESSMAP
    thickness *= texture(pbr_thicknessSampler, thicknessUV).g;
#endif

    float diffuseTransmission = clamp(pbrMaterial.diffuseTransmissionFactor, 0.0, 1.0);
#ifdef HAS_DIFFUSETRANSMISSIONMAP
    if (pbrMaterial.diffuseTransmissionMapEnabled) {
      diffuseTransmission *= texture(pbr_diffuseTransmissionSampler, diffuseTransmissionUV).a;
    }
#endif
    diffuseTransmission *= (1.0 - metallic) * (1.0 - transmission);
    vec3 diffuseTransmissionColor = pbrMaterial.diffuseTransmissionColorFactor;
#ifdef HAS_DIFFUSETRANSMISSIONCOLORMAP
    if (pbrMaterial.diffuseTransmissionColorMapEnabled) {
      diffuseTransmissionColor *= SRGBtoLINEAR(
        texture(pbr_diffuseTransmissionColorSampler, diffuseTransmissionColorUV)
      ).rgb;
    }
#endif
    vec3 multiscatterColor = pbrMaterial.multiscatterColorFactor;
#ifdef HAS_MULTISCATTERCOLORMAP
    if (pbrMaterial.multiscatterColorMapEnabled) {
      multiscatterColor *= SRGBtoLINEAR(
        texture(pbr_multiscatterColorSampler, multiscatterColorUV)
      ).rgb;
    }
#endif

    float clearcoatFactor = pbrMaterial.clearcoatFactor;
    float clearcoatRoughness = pbrMaterial.clearcoatRoughnessFactor;
#ifdef HAS_CLEARCOATMAP
    if (pbrMaterial.clearcoatMapEnabled) {
      clearcoatFactor *= texture(pbr_clearcoatSampler, clearcoatUV).r;
    }
#endif
#ifdef HAS_CLEARCOATROUGHNESSMAP
    if (pbrMaterial.clearcoatRoughnessMapEnabled) {
      clearcoatRoughness *= texture(pbr_clearcoatRoughnessSampler, clearcoatRoughnessUV).g;
    }
#endif
    clearcoatFactor = clamp(clearcoatFactor, 0.0, 1.0);
    clearcoatRoughness = clamp(clearcoatRoughness, c_MinRoughness, 1.0);
    vec3 clearcoatNormal = getClearcoatNormal(getTBN(clearcoatNormalUV), n, clearcoatNormalUV);
    clearcoatRoughness = widenSpecularRoughness(clearcoatRoughness, clearcoatNormal);

    vec3 sheenColor = pbrMaterial.sheenColorFactor;
    float sheenRoughness = pbrMaterial.sheenRoughnessFactor;
#ifdef HAS_SHEENCOLORMAP
    if (pbrMaterial.sheenColorMapEnabled) {
      sheenColor *= SRGBtoLINEAR(texture(pbr_sheenColorSampler, sheenColorUV)).rgb;
    }
#endif
#ifdef HAS_SHEENROUGHNESSMAP
    if (pbrMaterial.sheenRoughnessMapEnabled) {
      sheenRoughness *= texture(pbr_sheenRoughnessSampler, sheenRoughnessUV).a;
    }
#endif
    sheenRoughness = clamp(sheenRoughness, c_MinRoughness, 1.0);

    float iridescence = pbrMaterial.iridescenceFactor;
#ifdef HAS_IRIDESCENCEMAP
    if (pbrMaterial.iridescenceMapEnabled) {
      iridescence *= texture(pbr_iridescenceSampler, iridescenceUV).r;
    }
#endif
    iridescence = clamp(iridescence, 0.0, 1.0);
    float iridescenceThickness = mix(
      pbrMaterial.iridescenceThicknessRange.x,
      pbrMaterial.iridescenceThicknessRange.y,
      0.5
    );
#ifdef HAS_IRIDESCENCETHICKNESSMAP
    iridescenceThickness = mix(
      pbrMaterial.iridescenceThicknessRange.x,
      pbrMaterial.iridescenceThicknessRange.y,
      texture(pbr_iridescenceThicknessSampler, iridescenceThicknessUV).g
    );
#endif

    float anisotropyStrength = clamp(pbrMaterial.anisotropyStrength, 0.0, 1.0);
    vec2 anisotropyDirection = normalizeDirection(pbrMaterial.anisotropyDirection);
#ifdef HAS_ANISOTROPYMAP
    if (pbrMaterial.anisotropyMapEnabled) {
      vec3 anisotropySample = texture(pbr_anisotropySampler, anisotropyUV).rgb;
      anisotropyStrength *= anisotropySample.b;
      vec2 mappedDirection = anisotropySample.rg * 2.0 - 1.0;
      if (length(mappedDirection) > 0.0001) {
        anisotropyDirection = normalize(mappedDirection);
      }
    }
#endif
    anisotropyDirection = rotateDirection(anisotropyDirection, pbrMaterial.anisotropyRotation);
    vec3 anisotropyTangent = normalize(tbn[0] * anisotropyDirection.x + tbn[1] * anisotropyDirection.y);
    if (length(anisotropyTangent) < 0.0001) {
      anisotropyTangent = normalize(tbn[0]);
    }
    // Roughness is authored as perceptual roughness; as is convention,
    // convert to material roughness by squaring the perceptual roughness [2].
    float alphaRoughness = perceptualRoughness * perceptualRoughness;

    float dielectricF0 = getDielectricF0(pbrMaterial.ior);
    vec3 dielectricSpecularF0 = min(
      vec3(dielectricF0) * specularFactor * specularIntensity,
      vec3(1.0)
    );
    dielectricSpecularF0 = getIridescenceTint(
      iridescence,
      iridescenceThickness,
      NdotV,
      dielectricSpecularF0
    );
    vec3 diffuseColor = baseColor.rgb * (vec3(1.0) - dielectricSpecularF0);
    diffuseColor *= (1.0 - metallic) * (1.0 - transmission) * (1.0 - diffuseTransmission);
    vec3 specularColor = mix(dielectricSpecularF0, baseColor.rgb, metallic);

    float clearcoatViewFresnel = dielectricSchlick(
      0.04,
      clamp(abs(dot(clearcoatNormal, v)), 0.0, 1.0)
    );
    float sheenDirectionalAlbedo = maxComponent(sheenColor) *
      (0.157 + 0.343 * (1.0 - NdotV)) * (1.0 - sheenRoughness * 0.5);
    float baseLayerEnergy = (1.0 - clearcoatFactor * clearcoatViewFresnel) *
      (1.0 - clamp(sheenDirectionalAlbedo, 0.0, 1.0));
    diffuseColor *= baseLayerEnergy;
    specularColor *= baseLayerEnergy;

    // Compute reflectance.
    float reflectance = max(max(specularColor.r, specularColor.g), specularColor.b);

    // For typical incident reflectance range (between 4% to 100%) set the grazing
    // reflectance to 100% for typical fresnel effect.
    // For very low reflectance range on highly diffuse objects (below 4%),
    // incrementally reduce grazing reflecance to 0%.
    float reflectance90 = clamp(reflectance * 25.0, 0.0, 1.0);
    vec3 specularEnvironmentR0 = specularColor.rgb;
    vec3 specularEnvironmentR90 = vec3(1.0, 1.0, 1.0) * reflectance90;
    vec3 reflection = -normalize(reflect(v, n));

    PBRInfo pbrInfo = PBRInfo(
      0.0, // NdotL
      NdotV,
      0.0, // NdotH
      0.0, // LdotH
      0.0, // VdotH
      perceptualRoughness,
      metallic,
      specularEnvironmentR0,
      specularEnvironmentR90,
      alphaRoughness,
      diffuseColor,
      specularColor,
      n,
      v,
      n,
      n
    );


#ifdef USE_LIGHTS
    // Apply ambient light
    PBRInfo_setAmbientLight(pbrInfo);
    color += calculateMaterialLightColor(
      pbrInfo,
      lighting.ambientColor,
      clearcoatNormal,
      clearcoatFactor,
      clearcoatRoughness,
      sheenColor,
      sheenRoughness,
      anisotropyTangent,
      anisotropyStrength
    );

    // Apply directional light
    for(int i = 0; i < lighting.directionalLightCount; i++) {
      if (i < lighting.directionalLightCount) {
        PBRInfo_setDirectionalLight(pbrInfo, lighting_getDirectionalLight(i).direction);
        color += calculateMaterialLightColor(
          pbrInfo,
          lighting_getDirectionalLight(i).color,
          clearcoatNormal,
          clearcoatFactor,
          clearcoatRoughness,
          sheenColor,
          sheenRoughness,
          anisotropyTangent,
          anisotropyStrength
        );
        color += calculateDiffuseTransmissionLight(
          pbrInfo,
          lighting_getDirectionalLight(i).color,
          diffuseTransmissionColor,
          diffuseTransmission,
          multiscatterColor,
          thickness
        );
      }
    }

    // Apply point light
    for(int i = 0; i < lighting.pointLightCount; i++) {
      if (i < lighting.pointLightCount) {
        PBRInfo_setPointLight(pbrInfo, lighting_getPointLight(i));
        float attenuation = getPointLightAttenuation(lighting_getPointLight(i), distance(lighting_getPointLight(i).position, pbr_vPosition));
        color += calculateMaterialLightColor(
          pbrInfo,
          lighting_getPointLight(i).color / attenuation,
          clearcoatNormal,
          clearcoatFactor,
          clearcoatRoughness,
          sheenColor,
          sheenRoughness,
          anisotropyTangent,
          anisotropyStrength
        );
        color += calculateDiffuseTransmissionLight(
          pbrInfo,
          lighting_getPointLight(i).color / attenuation,
          diffuseTransmissionColor,
          diffuseTransmission,
          multiscatterColor,
          thickness
        );
      }
    }

    for(int i = 0; i < lighting.spotLightCount; i++) {
      if (i < lighting.spotLightCount) {
        PBRInfo_setSpotLight(pbrInfo, lighting_getSpotLight(i));
        float attenuation = getSpotLightAttenuation(lighting_getSpotLight(i), pbr_vPosition);
        color += calculateMaterialLightColor(
          pbrInfo,
          lighting_getSpotLight(i).color / attenuation,
          clearcoatNormal,
          clearcoatFactor,
          clearcoatRoughness,
          sheenColor,
          sheenRoughness,
          anisotropyTangent,
          anisotropyStrength
        );
        color += calculateDiffuseTransmissionLight(
          pbrInfo,
          lighting_getSpotLight(i).color / attenuation,
          diffuseTransmissionColor,
          diffuseTransmission,
          multiscatterColor,
          thickness
        );
      }
    }
#endif

    // Calculate lighting contribution from image based lighting source (IBL)
#ifdef USE_IBL
    if (pbrMaterial.IBLenabled) {
      color += getIBLContribution(
        pbrInfo,
        n,
        getAnisotropicReflection(pbrInfo, anisotropyTangent, anisotropyStrength)
      );
      color += calculateClearcoatIBLContribution(
        pbrInfo,
        clearcoatNormal,
        -normalize(reflect(v, clearcoatNormal)),
        clearcoatFactor,
        clearcoatRoughness
      );
      color += calculateDiffuseTransmissionIBL(
        pbrInfo,
        diffuseTransmissionColor,
        diffuseTransmission,
        multiscatterColor,
        thickness
      );
      color += sheenColor * pbrMaterial.scaleIBLAmbient.x * (1.0 - sheenRoughness) * 0.25;
    }
#endif

 // Apply optional PBR terms for additional (optional) shading
#ifdef HAS_OCCLUSIONMAP
    if (pbrMaterial.occlusionMapEnabled) {
      float ao = texture(pbr_occlusionSampler, occlusionUV).r;
      color = mix(color, color * ao, pbrMaterial.occlusionStrength);
    }
#endif

    vec3 emissive = pbrMaterial.emissiveFactor;
#ifdef HAS_EMISSIVEMAP
    if (pbrMaterial.emissiveMapEnabled) {
      emissive *= SRGBtoLINEAR(texture(pbr_emissiveSampler, emissiveUV)).rgb;
    }
#endif
    color += emissive * pbrMaterial.emissiveStrength;

    if (transmission > 0.0) {
#ifdef USE_TRANSMISSION_FRAMEBUFFER
      float dielectricFresnel = getDielectricF0(pbrMaterial.ior);
      float transmissionFresnel = dielectricFresnel +
        (1.0 - dielectricFresnel) * pow(1.0 - NdotV, 5.0);
      vec3 transmittedColor = getTransmittedSceneColor(
        pbr_vPosition,
        n,
        v,
        thickness,
        perceptualRoughness
      );
      color += transmittedColor * getVolumeAttenuation(thickness) *
        transmission * (1.0 - transmissionFresnel);
#else
      color = mix(color, color * getVolumeAttenuation(thickness), transmission);
#endif
    }

    // This section uses mix to override final color for reference app visualization
    // of various parameters in the lighting equation.
#ifdef PBR_DEBUG
    // TODO: Figure out how to debug multiple lights

    // color = mix(color, F, pbr_scaleFGDSpec.x);
    // color = mix(color, vec3(G), pbr_scaleFGDSpec.y);
    // color = mix(color, vec3(D), pbr_scaleFGDSpec.z);
    // color = mix(color, specContrib, pbr_scaleFGDSpec.w);

    // color = mix(color, diffuseContrib, pbr_scaleDiffBaseMR.x);
    color = mix(color, baseColor.rgb, pbrMaterial.scaleDiffBaseMR.y);
    color = mix(color, vec3(metallic), pbrMaterial.scaleDiffBaseMR.z);
    color = mix(color, vec3(perceptualRoughness), pbrMaterial.scaleDiffBaseMR.w);
#endif

  }

#ifdef USE_TRANSMISSION_FRAMEBUFFER
  float alpha = clamp(baseColor.a, 0.0, 1.0);
#else
  float alpha = clamp(baseColor.a * (1.0 - transmission), 0.0, 1.0);
#endif
  return vec4(applySceneColorManagement(color), alpha);
}
`,Kx=`struct PBRFragmentInputs {
  pbr_vPosition: vec3f,
  pbr_vUV0: vec2f,
  pbr_vUV1: vec2f,
  pbr_vTBN: mat3x3f,
  pbr_vNormal: vec3f
};

var<private> fragmentInputs: PBRFragmentInputs;

fn pbr_setPositionNormalTangentUV(
  position: vec4f,
  normal: vec4f,
  tangent: vec4f,
  uv0: vec2f,
  uv1: vec2f
)
{
  var pos: vec4f = pbrProjection.modelMatrix * position;
  fragmentInputs.pbr_vPosition = pos.xyz / pos.w;
  fragmentInputs.pbr_vNormal = vec3f(0.0, 0.0, 1.0);
  fragmentInputs.pbr_vTBN = mat3x3f(
    vec3f(1.0, 0.0, 0.0),
    vec3f(0.0, 1.0, 0.0),
    vec3f(0.0, 0.0, 1.0)
  );
  fragmentInputs.pbr_vUV0 = vec2f(0.0, 0.0);
  fragmentInputs.pbr_vUV1 = uv1;

#ifdef HAS_NORMALS
  let normalW: vec3f = normalize((pbrProjection.normalMatrix * vec4f(normal.xyz, 0.0)).xyz);
  fragmentInputs.pbr_vNormal = normalW;
#ifdef HAS_TANGENTS
  let tangentW: vec3f = normalize((pbrProjection.modelMatrix * vec4f(tangent.xyz, 0.0)).xyz);
  let bitangentW: vec3f = cross(normalW, tangentW) * tangent.w;
  fragmentInputs.pbr_vTBN = mat3x3f(tangentW, bitangentW, normalW);
#endif
#endif

#ifdef HAS_UV
  fragmentInputs.pbr_vUV0 = uv0;
#endif
}

struct pbrMaterialUniforms {
  // Material is unlit
  unlit: u32,

  // Base color map
  baseColorMapEnabled: u32,
  baseColorFactor: vec4f,

  normalMapEnabled : u32,
  normalScale: f32,  // #ifdef HAS_NORMALMAP

  emissiveMapEnabled: u32,
  emissiveFactor: vec3f, // #ifdef HAS_EMISSIVEMAP

  metallicRoughnessValues: vec2f,
  metallicRoughnessMapEnabled: u32,

  occlusionMapEnabled: i32,
  occlusionStrength: f32, // #ifdef HAS_OCCLUSIONMAP
  
  alphaCutoffEnabled: i32,
  alphaCutoff: f32, // #ifdef ALPHA_CUTOFF

  specularColorFactor: vec3f,
  specularIntensityFactor: f32,
  specularColorMapEnabled: i32,
  specularIntensityMapEnabled: i32,

  ior: f32,

  transmissionFactor: f32,
  transmissionMapEnabled: i32,

  thicknessFactor: f32,
  attenuationDistance: f32,
  attenuationColor: vec3f,

  clearcoatFactor: f32,
  clearcoatRoughnessFactor: f32,
  clearcoatMapEnabled: i32,
  clearcoatRoughnessMapEnabled: i32,

  sheenColorFactor: vec3f,
  sheenRoughnessFactor: f32,
  sheenColorMapEnabled: i32,
  sheenRoughnessMapEnabled: i32,

  iridescenceFactor: f32,
  iridescenceIor: f32,
  iridescenceThicknessRange: vec2f,
  iridescenceMapEnabled: i32,

  anisotropyStrength: f32,
  anisotropyRotation: f32,
  anisotropyDirection: vec2f,
  anisotropyMapEnabled: i32,

  emissiveStrength: f32,
  dispersion: f32,
  
  // IBL
  IBLenabled: i32,
  scaleIBLAmbient: vec2f, // #ifdef USE_IBL
  
  // debugging flags used for shader output of intermediate PBR variables
  // #ifdef PBR_DEBUG
  scaleDiffBaseMR: vec4f,
  scaleFGDSpec: vec4f,
  // #endif

  baseColorUVSet: i32,
  baseColorUVTransform: mat3x3f,
  metallicRoughnessUVSet: i32,
  metallicRoughnessUVTransform: mat3x3f,
  normalUVSet: i32,
  normalUVTransform: mat3x3f,
  occlusionUVSet: i32,
  occlusionUVTransform: mat3x3f,
  emissiveUVSet: i32,
  emissiveUVTransform: mat3x3f,
  specularColorUVSet: i32,
  specularColorUVTransform: mat3x3f,
  specularIntensityUVSet: i32,
  specularIntensityUVTransform: mat3x3f,
  transmissionUVSet: i32,
  transmissionUVTransform: mat3x3f,
  thicknessUVSet: i32,
  thicknessUVTransform: mat3x3f,
  clearcoatUVSet: i32,
  clearcoatUVTransform: mat3x3f,
  clearcoatRoughnessUVSet: i32,
  clearcoatRoughnessUVTransform: mat3x3f,
  clearcoatNormalUVSet: i32,
  clearcoatNormalUVTransform: mat3x3f,
  sheenColorUVSet: i32,
  sheenColorUVTransform: mat3x3f,
  sheenRoughnessUVSet: i32,
  sheenRoughnessUVTransform: mat3x3f,
  iridescenceUVSet: i32,
  iridescenceUVTransform: mat3x3f,
  iridescenceThicknessUVSet: i32,
  iridescenceThicknessUVTransform: mat3x3f,
  anisotropyUVSet: i32,
  anisotropyUVTransform: mat3x3f,

  bumpFactor: f32,
  bumpMapEnabled: i32,
  diffuseTransmissionFactor: f32,
  diffuseTransmissionMapEnabled: i32,
  diffuseTransmissionColorFactor: vec3f,
  diffuseTransmissionColorMapEnabled: i32,
  multiscatterColorFactor: vec3f,
  multiscatterColorMapEnabled: i32,
  scatterAnisotropy: f32,

  bumpUVSet: i32,
  bumpUVTransform: mat3x3f,
  diffuseTransmissionUVSet: i32,
  diffuseTransmissionUVTransform: mat3x3f,
  diffuseTransmissionColorUVSet: i32,
  diffuseTransmissionColorUVTransform: mat3x3f,
  multiscatterColorUVSet: i32,
  multiscatterColorUVTransform: mat3x3f,
}

@group(3) @binding(auto) var<uniform> pbrMaterial : pbrMaterialUniforms;

// Samplers
#ifdef HAS_BASECOLORMAP
@group(3) @binding(auto) var pbr_baseColorSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_baseColorSamplerSampler: sampler;
#endif
#ifdef HAS_NORMALMAP
@group(3) @binding(auto) var pbr_normalSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_normalSamplerSampler: sampler;
#endif
#ifdef HAS_EMISSIVEMAP
@group(3) @binding(auto) var pbr_emissiveSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_emissiveSamplerSampler: sampler;
#endif
#ifdef HAS_METALROUGHNESSMAP
@group(3) @binding(auto) var pbr_metallicRoughnessSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_metallicRoughnessSamplerSampler: sampler;
#endif
#ifdef HAS_OCCLUSIONMAP
@group(3) @binding(auto) var pbr_occlusionSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_occlusionSamplerSampler: sampler;
#endif
#ifdef HAS_SPECULARCOLORMAP
@group(3) @binding(auto) var pbr_specularColorSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_specularColorSamplerSampler: sampler;
#endif
#ifdef HAS_SPECULARINTENSITYMAP
@group(3) @binding(auto) var pbr_specularIntensitySampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_specularIntensitySamplerSampler: sampler;
#endif
#ifdef HAS_TRANSMISSIONMAP
@group(3) @binding(auto) var pbr_transmissionSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_transmissionSamplerSampler: sampler;
#endif
#ifdef HAS_THICKNESSMAP
@group(3) @binding(auto) var pbr_thicknessSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_thicknessSamplerSampler: sampler;
#endif
#ifdef HAS_CLEARCOATMAP
@group(3) @binding(auto) var pbr_clearcoatSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_clearcoatSamplerSampler: sampler;
#endif
#ifdef HAS_CLEARCOATROUGHNESSMAP
@group(3) @binding(auto) var pbr_clearcoatRoughnessSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_clearcoatRoughnessSamplerSampler: sampler;
#endif
#ifdef HAS_CLEARCOATNORMALMAP
@group(3) @binding(auto) var pbr_clearcoatNormalSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_clearcoatNormalSamplerSampler: sampler;
#endif
#ifdef HAS_SHEENCOLORMAP
@group(3) @binding(auto) var pbr_sheenColorSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_sheenColorSamplerSampler: sampler;
#endif
#ifdef HAS_SHEENROUGHNESSMAP
@group(3) @binding(auto) var pbr_sheenRoughnessSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_sheenRoughnessSamplerSampler: sampler;
#endif
#ifdef HAS_IRIDESCENCEMAP
@group(3) @binding(auto) var pbr_iridescenceSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_iridescenceSamplerSampler: sampler;
#endif
#ifdef HAS_IRIDESCENCETHICKNESSMAP
@group(3) @binding(auto) var pbr_iridescenceThicknessSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_iridescenceThicknessSamplerSampler: sampler;
#endif
#ifdef HAS_ANISOTROPYMAP
@group(3) @binding(auto) var pbr_anisotropySampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_anisotropySamplerSampler: sampler;
#endif
#ifdef HAS_BUMPMAP
@group(3) @binding(auto) var pbr_bumpSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_bumpSamplerSampler: sampler;
#endif
#ifdef HAS_DIFFUSETRANSMISSIONMAP
@group(3) @binding(auto) var pbr_diffuseTransmissionSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_diffuseTransmissionSamplerSampler: sampler;
#endif
#ifdef HAS_DIFFUSETRANSMISSIONCOLORMAP
@group(3) @binding(auto) var pbr_diffuseTransmissionColorSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_diffuseTransmissionColorSamplerSampler: sampler;
#endif
#ifdef HAS_MULTISCATTERCOLORMAP
@group(3) @binding(auto) var pbr_multiscatterColorSampler: texture_2d<f32>;
@group(3) @binding(auto) var pbr_multiscatterColorSamplerSampler: sampler;
#endif
// Encapsulate the various inputs used by the various functions in the shading equation
// We store values in this struct to simplify the integration of alternative implementations
// of the shading terms, outlined in the Readme.MD Appendix.
struct PBRInfo {
  NdotL: f32,                  // cos angle between normal and light direction
  NdotV: f32,                  // cos angle between normal and view direction
  NdotH: f32,                  // cos angle between normal and half vector
  LdotH: f32,                  // cos angle between light direction and half vector
  VdotH: f32,                  // cos angle between view direction and half vector
  perceptualRoughness: f32,    // roughness value, as authored by the model creator (input to shader)
  metalness: f32,              // metallic value at the surface
  reflectance0: vec3f,            // full reflectance color (normal incidence angle)
  reflectance90: vec3f,           // reflectance color at grazing angle
  alphaRoughness: f32,         // roughness mapped to a more linear change in the roughness (proposed by [2])
  diffuseColor: vec3f,            // color contribution from diffuse lighting
  specularColor: vec3f,           // color contribution from specular lighting
  n: vec3f,                       // normal at surface point
  v: vec3f,                       // vector from surface point to camera
  l: vec3f,                       // direction from the surface toward the current light
  h: vec3f                        // half vector between the current light and camera
};

const M_PI = 3.141592653589793;
const c_MinRoughness = 0.04;

// Widen sub-pixel specular lobes using the screen-space normal footprint.
// This is geometric specular antialiasing: the normal variance is converted
// into an additional squared perceptual roughness before evaluating BRDFs.
fn widenSpecularRoughness(perceptualRoughness: f32, normal: vec3f) -> f32 {
  let normalDerivativeX = dpdx(normal);
  let normalDerivativeY = dpdy(normal);
  let normalVariance =
    dot(normalDerivativeX, normalDerivativeX) +
    dot(normalDerivativeY, normalDerivativeY);
  let kernelRoughnessSquared = min(2.0 * normalVariance, 1.0);
  return clamp(
    sqrt(perceptualRoughness * perceptualRoughness + kernelRoughnessSquared),
    c_MinRoughness,
    1.0
  );
}

fn SRGBtoLINEAR(srgbIn: vec4f ) -> vec4f
{
  var linOut: vec3f = srgbIn.xyz;
#ifdef MANUAL_SRGB
  let bLess: vec3f = step(vec3f(0.04045), srgbIn.xyz);
  linOut = mix(
    srgbIn.xyz / vec3f(12.92),
    pow((srgbIn.xyz + vec3f(0.055)) / vec3f(1.055), vec3f(2.4)),
    bLess
  );
#ifdef SRGB_FAST_APPROXIMATION
  linOut = pow(srgbIn.xyz, vec3f(2.2));
#endif
#endif
  return vec4f(linOut, srgbIn.w);
}

fn getMaterialUV(uvSet: i32, uvTransform: mat3x3f) -> vec2f
{
  var baseUV = fragmentInputs.pbr_vUV0;
  if (uvSet == 1) {
    baseUV = fragmentInputs.pbr_vUV1;
  }
  return (uvTransform * vec3f(baseUV, 1.0)).xy;
}

// Build the tangent basis from interpolated attributes or screen-space derivatives.
fn getTBN(uv: vec2f) -> mat3x3f
{
  let pos_dx: vec3f = dpdx(fragmentInputs.pbr_vPosition);
  let pos_dy: vec3f = dpdy(fragmentInputs.pbr_vPosition);
  let tex_dx: vec3f = dpdx(vec3f(uv, 0.0));
  let tex_dy: vec3f = dpdy(vec3f(uv, 0.0));
  var t: vec3f = (tex_dy.y * pos_dx - tex_dx.y * pos_dy) / (tex_dx.x * tex_dy.y - tex_dy.x * tex_dx.y);

  var ng: vec3f = cross(pos_dy, pos_dx);
#ifdef HAS_NORMALS
  ng = normalize(fragmentInputs.pbr_vNormal);
#endif
  t = normalize(t - ng * dot(ng, t));
  var b: vec3f = normalize(cross(ng, t));
  var tbn: mat3x3f = mat3x3f(t, b, ng);
#ifdef HAS_TANGENTS
  tbn = fragmentInputs.pbr_vTBN;
#endif

  return tbn;
}

// Find the normal for this fragment, pulling either from a predefined normal map
// or from the interpolated mesh normal and tangent attributes.
fn getMappedNormal(
  normalSampler: texture_2d<f32>,
  normalSamplerBinding: sampler,
  tbn: mat3x3f,
  normalScale: f32,
  uv: vec2f
) -> vec3f
{
  let n = textureSample(normalSampler, normalSamplerBinding, uv).rgb;
  return normalize(tbn * ((2.0 * n - 1.0) * vec3f(normalScale, normalScale, 1.0)));
}

fn getNormal(tbn: mat3x3f, uv: vec2f) -> vec3f
{
  // The tbn matrix is linearly interpolated, so we need to re-normalize
  var n: vec3f = normalize(tbn[2].xyz);
#ifdef HAS_NORMALMAP
  n = getMappedNormal(
    pbr_normalSampler,
    pbr_normalSamplerSampler,
    tbn,
    pbrMaterial.normalScale,
    uv
  );
#endif

#ifdef HAS_BUMPMAP
  let bumpUV = getMaterialUV(pbrMaterial.bumpUVSet, pbrMaterial.bumpUVTransform);
  let bumpTexelSize = 1.0 / vec2f(textureDimensions(pbr_bumpSampler, 0));
  let bumpHeight = textureSample(pbr_bumpSampler, pbr_bumpSamplerSampler, bumpUV).r;
  let bumpGradient = vec2f(
    textureSample(
      pbr_bumpSampler,
      pbr_bumpSamplerSampler,
      bumpUV + vec2f(bumpTexelSize.x, 0.0)
    ).r - bumpHeight,
    textureSample(
      pbr_bumpSampler,
      pbr_bumpSamplerSampler,
      bumpUV + vec2f(0.0, bumpTexelSize.y)
    ).r - bumpHeight
  );
  n = normalize(n - pbrMaterial.bumpFactor *
    (tbn[0] * bumpGradient.x + tbn[1] * bumpGradient.y));
#endif

  return n;
}

fn getClearcoatNormal(tbn: mat3x3f, baseNormal: vec3f, uv: vec2f) -> vec3f
{
#ifdef HAS_CLEARCOATNORMALMAP
  return getMappedNormal(
    pbr_clearcoatNormalSampler,
    pbr_clearcoatNormalSamplerSampler,
    tbn,
    1.0,
    uv
  );
#else
  return baseNormal;
#endif
}

// Calculation of the lighting contribution from an optional Image Based Light source.
// Precomputed Environment Maps are required uniform inputs and are computed as outlined in [1].
// See our README.md on Environment Maps [3] for additional discussion.
#ifdef USE_IBL
fn getIBLContribution(pbrInfo: PBRInfo, n: vec3f, reflection: vec3f) -> vec3f
{
#ifdef USE_SCENE_ENVIRONMENT
  let maximumMipLevel = max(pbrScene.environmentMipCount - 1.0, 0.0);
  let rotationSine = sin(pbrScene.environmentRotation);
  let rotationCosine = cos(pbrScene.environmentRotation);
  let environmentRotation = mat2x2f(
    vec2f(rotationCosine, rotationSine),
    vec2f(-rotationSine, rotationCosine)
  );
  let rotatedNormal = environmentRotation * n.xz;
  let rotatedReflection = environmentRotation * reflection.xz;
  let environmentNormal = vec3f(rotatedNormal.x, n.y, rotatedNormal.y);
  let environmentReflection = vec3f(rotatedReflection.x, reflection.y, rotatedReflection.y);
#else
  let maximumMipLevel = 9.0;
  let environmentNormal = n;
  let environmentReflection = reflection;
#endif
  let lod = pbrInfo.perceptualRoughness * maximumMipLevel;
  // retrieve a scale and bias to F0. See [1], Figure 3
  let brdfSample = textureSampleLevel(
    pbr_brdfLUT,
    pbr_brdfLUTSampler,
    vec2f(pbrInfo.NdotV, 1.0 - pbrInfo.perceptualRoughness),
    0.0
  );
  let diffuseSample = textureSampleLevel(
    pbr_diffuseEnvSampler,
    pbr_diffuseEnvSamplerSampler,
    environmentNormal,
    0.0
  );
  var specularSample = textureSampleLevel(
    pbr_specularEnvSampler,
    pbr_specularEnvSamplerSampler,
    environmentReflection,
    0.0
  );
#ifdef USE_TEX_LOD
  specularSample = textureSampleLevel(
    pbr_specularEnvSampler,
    pbr_specularEnvSamplerSampler,
    environmentReflection,
    lod
  );
#endif

#ifdef USE_SCENE_ENVIRONMENT
  let brdf = brdfSample.rgb;
  let diffuseLight = diffuseSample.rgb;
  let specularLight = specularSample.rgb;
#else
  let brdf = SRGBtoLINEAR(brdfSample).rgb;
  let diffuseLight = SRGBtoLINEAR(diffuseSample).rgb;
  let specularLight = SRGBtoLINEAR(specularSample).rgb;
#endif

  let diffuse = diffuseLight * pbrInfo.diffuseColor * pbrMaterial.scaleIBLAmbient.x;
  let specular =
    specularLight * (pbrInfo.specularColor * brdf.x + brdf.y) * pbrMaterial.scaleIBLAmbient.y;

#ifdef USE_SCENE_ENVIRONMENT
  return (diffuse + specular) * max(pbrScene.environmentIntensity, 0.0);
#else
  return diffuse + specular;
#endif
}
#endif

// Basic Lambertian diffuse
// Implementation from Lambert's Photometria https://archive.org/details/lambertsphotome00lambgoog
// See also [1], Equation 1
fn diffuse(pbrInfo: PBRInfo) -> vec3<f32> {
  return pbrInfo.diffuseColor / M_PI;
}

// The following equation models the Fresnel reflectance term of the spec equation (aka F())
// Implementation of fresnel from [4], Equation 15
fn specularReflection(pbrInfo: PBRInfo) -> vec3<f32> {
  return pbrInfo.reflectance0 +
    (pbrInfo.reflectance90 - pbrInfo.reflectance0) *
    pow(clamp(1.0 - pbrInfo.VdotH, 0.0, 1.0), 5.0);
}

// This calculates the specular geometric attenuation (aka G()),
// where rougher material will reflect less light back to the viewer.
// This implementation is based on [1] Equation 4, and we adopt their modifications to
// alphaRoughness as input as originally proposed in [2].
fn geometricOcclusion(pbrInfo: PBRInfo) -> f32 {
  let NdotL: f32 = pbrInfo.NdotL;
  let NdotV: f32 = pbrInfo.NdotV;
  let r: f32 = pbrInfo.alphaRoughness;

  let attenuationL = 2.0 * NdotL / (NdotL + sqrt(r * r + (1.0 - r * r) * (NdotL * NdotL)));
  let attenuationV = 2.0 * NdotV / (NdotV + sqrt(r * r + (1.0 - r * r) * (NdotV * NdotV)));
  return attenuationL * attenuationV;
}

// The following equation(s) model the distribution of microfacet normals across
// the area being drawn (aka D())
// Implementation from "Average Irregularity Representation of a Roughened Surface
// for Ray Reflection" by T. S. Trowbridge, and K. P. Reitz
// Follows the distribution function recommended in the SIGGRAPH 2013 course notes
// from EPIC Games [1], Equation 3.
fn microfacetDistribution(pbrInfo: PBRInfo) -> f32 {
  let roughnessSq = pbrInfo.alphaRoughness * pbrInfo.alphaRoughness;
  let f = (pbrInfo.NdotH * roughnessSq - pbrInfo.NdotH) * pbrInfo.NdotH + 1.0;
  return roughnessSq / (M_PI * f * f);
}

fn maxComponent(value: vec3f) -> f32 {
  return max(max(value.r, value.g), value.b);
}

fn getDielectricF0(ior: f32) -> f32 {
  let clampedIor = max(ior, 1.0);
  let ratio = (clampedIor - 1.0) / (clampedIor + 1.0);
  return ratio * ratio;
}

fn normalizeDirection(direction: vec2f) -> vec2f {
  let directionLength = length(direction);
  if (directionLength > 0.0001) {
    return direction / directionLength;
  }

  return vec2f(1.0, 0.0);
}

fn rotateDirection(direction: vec2f, rotation: f32) -> vec2f {
  let s = sin(rotation);
  let c = cos(rotation);
  return vec2f(direction.x * c - direction.y * s, direction.x * s + direction.y * c);
}

fn encodeLinearSRGB(linearColor: vec3f) -> vec3f {
  let positiveColor = max(linearColor, vec3f(0.0));
  return select(
    positiveColor * 12.92,
    1.055 * pow(positiveColor, vec3f(1.0 / 2.4)) - 0.055,
    positiveColor > vec3f(0.0031308)
  );
}

fn toneMapKhronosPBRNeutral(inputColor: vec3f) -> vec3f {
  let startCompression = 0.76;
  let darkestChannel = min(inputColor.r, min(inputColor.g, inputColor.b));
  let offset = select(
    0.04,
    darkestChannel - 6.25 * darkestChannel * darkestChannel,
    darkestChannel < 0.08
  );
  var color = inputColor - vec3f(offset);
  let peak = maxComponent(color);
  if (peak < startCompression) {
    return color;
  }

  let compressionRange = 1.0 - startCompression;
  let compressedPeak = 1.0 - compressionRange * compressionRange /
    (peak + compressionRange - startCompression);
  color *= compressedPeak / max(peak, 0.0001);
  let desaturation = 1.0 - 1.0 / (0.15 * (peak - compressedPeak) + 1.0);
  return mix(color, vec3f(compressedPeak), desaturation);
}

fn applySceneColorManagement(sceneColor: vec3f) -> vec3f {
#ifdef USE_SCENE_COLOR_MANAGEMENT
  var color = max(sceneColor, vec3f(0.0)) * max(pbrScene.exposure, 0.0);
  if (pbrScene.toneMapMode == 1) {
    color /= vec3f(1.0) + color;
  } else if (pbrScene.toneMapMode == 2) {
    color = toneMapKhronosPBRNeutral(color);
  } else if (pbrScene.toneMapMode == 3) {
    color = clamp(
      (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14),
      vec3f(0.0),
      vec3f(1.0)
    );
  }
  if (pbrScene.outputEncoding == 0) {
    return color;
  }
  return encodeLinearSRGB(color);
#else
  return pow(max(sceneColor, vec3f(0.0)), vec3f(1.0 / 2.2));
#endif
}

fn dielectricSchlick(reflectance: f32, cosine: f32) -> f32 {
  return reflectance + (1.0 - reflectance) * pow(clamp(1.0 - cosine, 0.0, 1.0), 5.0);
}

fn evaluateIridescenceSensitivity(opticalPathDifference: f32, phaseShift: vec3f) -> vec3f {
  let phase = 2.0 * M_PI * opticalPathDifference * 1.0e-9;
  let sensitivity = vec3f(5.4856e-13, 4.4201e-13, 5.2481e-13);
  let position = vec3f(1.6810e6, 1.7953e6, 2.2084e6);
  let variance = vec3f(4.3278e9, 9.3046e9, 6.6121e9);
  var xyz = sensitivity * sqrt(2.0 * M_PI * variance) *
    cos(position * phase + phaseShift) * exp(-phase * phase * variance);
  xyz.x += 9.7470e-14 * sqrt(2.0 * M_PI * 4.5282e9) *
    cos(2.2399e6 * phase + phaseShift.x) * exp(-4.5282e9 * phase * phase);
  xyz /= 1.0685e-7;
  return mat3x3f(
    vec3f(3.2404542, -0.9692660, 0.0556434),
    vec3f(-1.5371385, 1.8760108, -0.2040259),
    vec3f(-0.4985314, 0.0415560, 1.0572252)
  ) * xyz;
}

fn getIridescenceTint(
  iridescence: f32,
  thickness: f32,
  NdotV: f32,
  baseReflectance: vec3f
) -> vec3f {
  if (iridescence <= 0.0 || thickness <= 0.0) {
    return baseReflectance;
  }

  let filmIor = max(pbrMaterial.iridescenceIor, 1.0);
  let sineSquared = (1.0 - NdotV * NdotV) / (filmIor * filmIor);
  let cosineSquared = 1.0 - sineSquared;
  if (cosineSquared <= 0.0) {
    return mix(baseReflectance, vec3f(1.0), iridescence);
  }
  let filmCosine = sqrt(cosineSquared);
  let firstInterfaceReflectance = dielectricSchlick(getDielectricF0(filmIor), NdotV);
  let transmittedEnergy = 1.0 - firstInterfaceReflectance;
  let squareRootReflectance = sqrt(clamp(baseReflectance, vec3f(0.0), vec3f(0.9999)));
  let baseIor = (vec3f(1.0) + squareRootReflectance) /
    (vec3f(1.0) - squareRootReflectance);
  var secondInterfaceF0 = (baseIor - vec3f(filmIor)) / (baseIor + vec3f(filmIor));
  secondInterfaceF0 *= secondInterfaceF0;
  let secondInterfaceReflectance = secondInterfaceF0 +
    (vec3f(1.0) - secondInterfaceF0) * pow(1.0 - filmCosine, 5.0);
  let phaseShift = vec3f(M_PI) + select(
    vec3f(0.0),
    vec3f(M_PI),
    baseIor < vec3f(filmIor)
  );
  let opticalPathDifference = 2.0 * filmIor * thickness * filmCosine;
  let combinedReflectance = clamp(
    firstInterfaceReflectance * secondInterfaceReflectance,
    vec3f(0.00001),
    vec3f(0.9999)
  );
  let recurringAmplitude = sqrt(combinedReflectance);
  let interfaceResponse = transmittedEnergy * transmittedEnergy * secondInterfaceReflectance /
    (vec3f(1.0) - combinedReflectance);
  var reflectedSpectrum = vec3f(firstInterfaceReflectance) + interfaceResponse;
  var harmonicAmplitude = interfaceResponse - vec3f(transmittedEnergy);
  for (var harmonic = 1; harmonic <= 2; harmonic++) {
    harmonicAmplitude *= recurringAmplitude;
    reflectedSpectrum += harmonicAmplitude * 2.0 * evaluateIridescenceSensitivity(
      f32(harmonic) * opticalPathDifference,
      f32(harmonic) * phaseShift
    );
  }
  return mix(baseReflectance, clamp(reflectedSpectrum, vec3f(0.0), vec3f(1.0)), iridescence);
}

fn getVolumeAttenuation(thickness: f32) -> vec3f {
  if (thickness <= 0.0) {
    return vec3f(1.0);
  }

  let attenuationCoefficient =
    -log(max(pbrMaterial.attenuationColor, vec3f(0.0001))) /
    max(pbrMaterial.attenuationDistance, 0.0001);
  return exp(-attenuationCoefficient * thickness);
}

// KHR_materials_volume_scatter is an active draft. This evaluates a local,
// thickness-aware single-scattering approximation rather than random walk.
fn getDiffuseTransmissionAttenuation(
  pbrInfo: PBRInfo,
  multiscatterColor: vec3f,
  thickness: f32
) -> vec3f {
  let volumeAttenuation = getVolumeAttenuation(thickness);
  let scatteringStrength = maxComponent(multiscatterColor);
  if (thickness <= 0.0 || scatteringStrength <= 0.0001) {
    return volumeAttenuation;
  }

  let anisotropy = clamp(pbrMaterial.scatterAnisotropy, -0.95, 0.95);
  let scatteringCosine = clamp(dot(-pbrInfo.v, pbrInfo.l), -1.0, 1.0);
  let phaseDenominator = max(
    1.0 + anisotropy * anisotropy - 2.0 * anisotropy * scatteringCosine,
    0.0001
  );
  let phaseWeight = clamp(
    (1.0 - anisotropy * anisotropy) / pow(phaseDenominator, 1.5),
    0.0,
    4.0
  );
  let scatteringDepth = thickness / max(pbrMaterial.attenuationDistance, 0.0001);
  let scatteringProbability = 1.0 - exp(-scatteringDepth);
  let scatteringColor = clamp(multiscatterColor, vec3f(0.0), vec3f(1.0));
  return mix(
    volumeAttenuation,
    volumeAttenuation * mix(vec3f(1.0), scatteringColor * phaseWeight, scatteringColor),
    scatteringProbability
  );
}

fn calculateDiffuseTransmissionLight(
  pbrInfo: PBRInfo,
  lightColor: vec3f,
  diffuseTransmissionColor: vec3f,
  diffuseTransmission: f32,
  multiscatterColor: vec3f,
  thickness: f32
) -> vec3f {
  let oppositeHemisphere = max(dot(-pbrInfo.n, pbrInfo.l), 0.0);
  if (oppositeHemisphere <= 0.0 || diffuseTransmission <= 0.0) {
    return vec3f(0.0);
  }

  let nonReflectedEnergy = vec3f(1.0) - clamp(pbrInfo.reflectance0, vec3f(0.0), vec3f(1.0));
  let attenuatedColor = getDiffuseTransmissionAttenuation(
    pbrInfo,
    multiscatterColor,
    thickness
  );
  return lightColor * diffuseTransmissionColor * nonReflectedEnergy *
    attenuatedColor * (diffuseTransmission * oppositeHemisphere / M_PI);
}

#ifdef USE_IBL
fn calculateDiffuseTransmissionIBL(
  pbrInfo: PBRInfo,
  diffuseTransmissionColor: vec3f,
  diffuseTransmission: f32,
  multiscatterColor: vec3f,
  thickness: f32
) -> vec3f {
  if (diffuseTransmission <= 0.0) {
    return vec3f(0.0);
  }

#ifdef USE_SCENE_ENVIRONMENT
  let rotationSine = sin(pbrScene.environmentRotation);
  let rotationCosine = cos(pbrScene.environmentRotation);
  let environmentRotation = mat2x2f(
    vec2f(rotationCosine, rotationSine),
    vec2f(-rotationSine, rotationCosine)
  );
  let rotatedNormal = environmentRotation * -pbrInfo.n.xz;
  let oppositeNormal = vec3f(rotatedNormal.x, -pbrInfo.n.y, rotatedNormal.y);
  let environmentColor = textureSampleLevel(
    pbr_diffuseEnvSampler,
    pbr_diffuseEnvSamplerSampler,
    oppositeNormal,
    0.0
  ).rgb * max(pbrScene.environmentIntensity, 0.0);
#else
  let environmentColor = SRGBtoLINEAR(
    textureSampleLevel(pbr_diffuseEnvSampler, pbr_diffuseEnvSamplerSampler, -pbrInfo.n, 0.0)
  ).rgb;
#endif
  let nonReflectedEnergy = vec3f(1.0) - clamp(pbrInfo.reflectance0, vec3f(0.0), vec3f(1.0));
  return environmentColor * diffuseTransmissionColor * nonReflectedEnergy *
    getDiffuseTransmissionAttenuation(pbrInfo, multiscatterColor, thickness) *
    diffuseTransmission * pbrMaterial.scaleIBLAmbient.x;
}
#endif

#ifdef USE_TRANSMISSION_FRAMEBUFFER
fn sampleTransmittedSceneColor(
  position: vec3f,
  normal: vec3f,
  viewDirection: vec3f,
  thickness: f32,
  perceptualRoughness: f32,
  indexOfRefraction: f32
) -> vec3f {
  let refractionDirection = refract(
    -viewDirection,
    normal,
    1.0 / max(indexOfRefraction, 1.0)
  );
  let refractedPosition = position + refractionDirection * thickness;
  let clipPosition = pbrScene.projectionMatrix *
    pbrScene.viewMatrix * vec4f(refractedPosition, 1.0);
  var textureCoordinate = clipPosition.xy / max(clipPosition.w, 0.0001) * 0.5 + 0.5;
  textureCoordinate.y = 1.0 - textureCoordinate.y;
  textureCoordinate = clamp(textureCoordinate, vec2f(0.001), vec2f(0.999));

  let blurRadius = perceptualRoughness * perceptualRoughness * 8.0 /
    max(pbrScene.framebufferSize, vec2f(1.0));
  var sceneColor = textureSampleLevel(
    pbr_transmissionFramebufferSampler,
    pbr_transmissionFramebufferSamplerSampler,
    textureCoordinate,
    0.0
  ).rgb * 0.4;
  sceneColor += textureSampleLevel(
    pbr_transmissionFramebufferSampler,
    pbr_transmissionFramebufferSamplerSampler,
    textureCoordinate + vec2f(blurRadius.x, 0.0),
    0.0
  ).rgb * 0.15;
  sceneColor += textureSampleLevel(
    pbr_transmissionFramebufferSampler,
    pbr_transmissionFramebufferSamplerSampler,
    textureCoordinate - vec2f(blurRadius.x, 0.0),
    0.0
  ).rgb * 0.15;
  sceneColor += textureSampleLevel(
    pbr_transmissionFramebufferSampler,
    pbr_transmissionFramebufferSamplerSampler,
    textureCoordinate + vec2f(0.0, blurRadius.y),
    0.0
  ).rgb * 0.15;
  sceneColor += textureSampleLevel(
    pbr_transmissionFramebufferSampler,
    pbr_transmissionFramebufferSamplerSampler,
    textureCoordinate - vec2f(0.0, blurRadius.y),
    0.0
  ).rgb * 0.15;
  return max(sceneColor, vec3f(0.0));
}

fn getTransmittedSceneColor(
  position: vec3f,
  normal: vec3f,
  viewDirection: vec3f,
  thickness: f32,
  perceptualRoughness: f32
) -> vec3f {
  if (pbrMaterial.dispersion <= 0.0) {
    return sampleTransmittedSceneColor(
      position,
      normal,
      viewDirection,
      thickness,
      perceptualRoughness,
      pbrMaterial.ior
    );
  }

  let halfSpread = (max(pbrMaterial.ior, 1.0) - 1.0) * 0.025 * pbrMaterial.dispersion;
  let indicesOfRefraction = max(
    vec3f(pbrMaterial.ior - halfSpread, pbrMaterial.ior, pbrMaterial.ior + halfSpread),
    vec3f(1.0)
  );
  return vec3f(
    sampleTransmittedSceneColor(
      position, normal, viewDirection, thickness, perceptualRoughness, indicesOfRefraction.r
    ).r,
    sampleTransmittedSceneColor(
      position, normal, viewDirection, thickness, perceptualRoughness, indicesOfRefraction.g
    ).g,
    sampleTransmittedSceneColor(
      position, normal, viewDirection, thickness, perceptualRoughness, indicesOfRefraction.b
    ).b
  );
}
#endif

fn createClearcoatPBRInfo(
  basePBRInfo: PBRInfo,
  clearcoatNormal: vec3f,
  clearcoatRoughness: f32
) -> PBRInfo {
  let perceptualRoughness = clamp(clearcoatRoughness, c_MinRoughness, 1.0);
  let alphaRoughness = perceptualRoughness * perceptualRoughness;
  let NdotV = clamp(abs(dot(clearcoatNormal, basePBRInfo.v)), 0.001, 1.0);

  return PBRInfo(
    basePBRInfo.NdotL,
    NdotV,
    basePBRInfo.NdotH,
    basePBRInfo.LdotH,
    basePBRInfo.VdotH,
    perceptualRoughness,
    0.0,
    vec3f(0.04),
    vec3f(1.0),
    alphaRoughness,
    vec3f(0.0),
    vec3f(0.04),
    clearcoatNormal,
    basePBRInfo.v,
    basePBRInfo.l,
    basePBRInfo.h
  );
}

fn calculateClearcoatContribution(
  pbrInfo: PBRInfo,
  lightColor: vec3f,
  clearcoatNormal: vec3f,
  clearcoatFactor: f32,
  clearcoatRoughness: f32
) -> vec3f {
  if (clearcoatFactor <= 0.0) {
    return vec3f(0.0);
  }

  let clearcoatPBRInfo = createClearcoatPBRInfo(pbrInfo, clearcoatNormal, clearcoatRoughness);
  return calculateFinalColor(clearcoatPBRInfo, lightColor) * clearcoatFactor;
}

#ifdef USE_IBL
fn calculateClearcoatIBLContribution(
  pbrInfo: PBRInfo,
  clearcoatNormal: vec3f,
  reflection: vec3f,
  clearcoatFactor: f32,
  clearcoatRoughness: f32
) -> vec3f {
  if (clearcoatFactor <= 0.0) {
    return vec3f(0.0);
  }

  let clearcoatPBRInfo = createClearcoatPBRInfo(pbrInfo, clearcoatNormal, clearcoatRoughness);
  return getIBLContribution(clearcoatPBRInfo, clearcoatNormal, reflection) * clearcoatFactor;
}
#endif

fn calculateSheenContribution(
  pbrInfo: PBRInfo,
  lightColor: vec3f,
  sheenColor: vec3f,
  sheenRoughness: f32
) -> vec3f {
  if (maxComponent(sheenColor) <= 0.0) {
    return vec3f(0.0);
  }

  let alpha = max(sheenRoughness * sheenRoughness, 0.0001);
  let inverseAlpha = 1.0 / alpha;
  let sineSquared = max(1.0 - pbrInfo.NdotH * pbrInfo.NdotH, 0.0);
  let distribution = (2.0 + inverseAlpha) * pow(sineSquared, inverseAlpha * 0.5) /
    (2.0 * M_PI);
  let visibility = 1.0 / max(
    4.0 * (pbrInfo.NdotL + pbrInfo.NdotV - pbrInfo.NdotL * pbrInfo.NdotV),
    0.0001
  );
  return pbrInfo.NdotL * lightColor * sheenColor * distribution * visibility *
    (1.0 - pbrInfo.metalness);
}

fn calculateAnisotropicLightColor(
  pbrInfo: PBRInfo,
  lightColor: vec3f,
  anisotropyTangent: vec3f,
  anisotropyStrength: f32
) -> vec3f {
  if (anisotropyStrength <= 0.0) {
    return calculateFinalColor(pbrInfo, lightColor);
  }

  let anisotropyBitangent = normalize(cross(pbrInfo.n, anisotropyTangent));
  let tangentRoughness = mix(
    pbrInfo.alphaRoughness,
    1.0,
    anisotropyStrength * anisotropyStrength
  );
  let bitangentRoughness = clamp(pbrInfo.alphaRoughness, 0.001, 1.0);
  let roughnessProduct = tangentRoughness * bitangentRoughness;
  let distributionVector = vec3f(
    bitangentRoughness * dot(anisotropyTangent, pbrInfo.h),
    tangentRoughness * dot(anisotropyBitangent, pbrInfo.h),
    roughnessProduct * pbrInfo.NdotH
  );
  let distributionFactor = roughnessProduct /
    max(dot(distributionVector, distributionVector), 0.000001);
  let distribution = roughnessProduct * distributionFactor * distributionFactor / M_PI;
  let viewMask = pbrInfo.NdotL * length(vec3f(
    tangentRoughness * dot(anisotropyTangent, pbrInfo.v),
    bitangentRoughness * dot(anisotropyBitangent, pbrInfo.v),
    pbrInfo.NdotV
  ));
  let lightMask = pbrInfo.NdotV * length(vec3f(
    tangentRoughness * dot(anisotropyTangent, pbrInfo.l),
    bitangentRoughness * dot(anisotropyBitangent, pbrInfo.l),
    pbrInfo.NdotL
  ));
  let visibility = clamp(0.5 / max(viewMask + lightMask, 0.000001), 0.0, 1.0);
  let fresnel = specularReflection(pbrInfo);
  let diffuseContribution = (vec3f(1.0) - fresnel) * diffuse(pbrInfo);
  return pbrInfo.NdotL * lightColor *
    (diffuseContribution + fresnel * distribution * visibility);
}

fn getAnisotropicReflection(
  pbrInfo: PBRInfo,
  anisotropyTangent: vec3f,
  anisotropyStrength: f32
) -> vec3f {
  if (anisotropyStrength <= 0.0) {
    return -normalize(reflect(pbrInfo.v, pbrInfo.n));
  }
  let anisotropyBitangent = normalize(cross(pbrInfo.n, anisotropyTangent));
  var anisotropicNormal = normalize(cross(anisotropyBitangent, pbrInfo.v));
  anisotropicNormal = normalize(cross(anisotropicNormal, anisotropyBitangent));
  let bend = anisotropyStrength * (1.0 - pbrInfo.perceptualRoughness);
  return -normalize(reflect(pbrInfo.v, normalize(mix(pbrInfo.n, anisotropicNormal, bend))));
}

fn calculateMaterialLightColor(
  pbrInfo: PBRInfo,
  lightColor: vec3f,
  clearcoatNormal: vec3f,
  clearcoatFactor: f32,
  clearcoatRoughness: f32,
  sheenColor: vec3f,
  sheenRoughness: f32,
  anisotropyTangent: vec3f,
  anisotropyStrength: f32
) -> vec3f {
  var color = calculateAnisotropicLightColor(
    pbrInfo,
    lightColor,
    anisotropyTangent,
    anisotropyStrength
  );
  color += calculateClearcoatContribution(
    pbrInfo,
    lightColor,
    clearcoatNormal,
    clearcoatFactor,
    clearcoatRoughness
  );
  color += calculateSheenContribution(pbrInfo, lightColor, sheenColor, sheenRoughness);
  return color;
}

fn PBRInfo_setAmbientLight(pbrInfo: ptr<function, PBRInfo>) {
  (*pbrInfo).NdotL = 1.0;
  (*pbrInfo).NdotH = 0.0;
  (*pbrInfo).LdotH = 0.0;
  (*pbrInfo).VdotH = 1.0;
  (*pbrInfo).l = (*pbrInfo).n;
  (*pbrInfo).h = (*pbrInfo).n;
}

fn PBRInfo_setDirectionalLight(pbrInfo: ptr<function, PBRInfo>, lightDirection: vec3<f32>) {
  let n = (*pbrInfo).n;
  let v = (*pbrInfo).v;
  let l = normalize(lightDirection);             // Vector from surface point to light
  let h = normalize(l + v);                      // Half vector between both l and v

  (*pbrInfo).NdotL = clamp(dot(n, l), 0.001, 1.0);
  (*pbrInfo).NdotH = clamp(dot(n, h), 0.0, 1.0);
  (*pbrInfo).LdotH = clamp(dot(l, h), 0.0, 1.0);
  (*pbrInfo).VdotH = clamp(dot(v, h), 0.0, 1.0);
  (*pbrInfo).l = l;
  (*pbrInfo).h = h;
}

fn PBRInfo_setPointLight(pbrInfo: ptr<function, PBRInfo>, pointLight: PointLight) {
  let light_direction = normalize(pointLight.position - fragmentInputs.pbr_vPosition);
  PBRInfo_setDirectionalLight(pbrInfo, light_direction);
}

fn PBRInfo_setSpotLight(pbrInfo: ptr<function, PBRInfo>, spotLight: SpotLight) {
  let light_direction = normalize(spotLight.position - fragmentInputs.pbr_vPosition);
  PBRInfo_setDirectionalLight(pbrInfo, light_direction);
}

fn calculateFinalColor(pbrInfo: PBRInfo, lightColor: vec3<f32>) -> vec3<f32> {
  // Calculate the shading terms for the microfacet specular shading model
  let F = specularReflection(pbrInfo);
  let G = geometricOcclusion(pbrInfo);
  let D = microfacetDistribution(pbrInfo);

  // Calculation of analytical lighting contribution
  let diffuseContrib = (1.0 - F) * diffuse(pbrInfo);
  let specContrib = F * G * D / (4.0 * pbrInfo.NdotL * pbrInfo.NdotV);
  // Obtain final intensity as reflectance (BRDF) scaled by the energy of the light (cosine law)
  return pbrInfo.NdotL * lightColor * (diffuseContrib + specContrib);
}

fn pbr_filterColor(vertexColor: vec4<f32>) -> vec4<f32> {
  let baseColorUV = getMaterialUV(pbrMaterial.baseColorUVSet, pbrMaterial.baseColorUVTransform);
  let metallicRoughnessUV = getMaterialUV(
    pbrMaterial.metallicRoughnessUVSet,
    pbrMaterial.metallicRoughnessUVTransform
  );
  let normalUV = getMaterialUV(pbrMaterial.normalUVSet, pbrMaterial.normalUVTransform);
  let occlusionUV = getMaterialUV(pbrMaterial.occlusionUVSet, pbrMaterial.occlusionUVTransform);
  let emissiveUV = getMaterialUV(pbrMaterial.emissiveUVSet, pbrMaterial.emissiveUVTransform);
  let specularColorUV = getMaterialUV(
    pbrMaterial.specularColorUVSet,
    pbrMaterial.specularColorUVTransform
  );
  let specularIntensityUV = getMaterialUV(
    pbrMaterial.specularIntensityUVSet,
    pbrMaterial.specularIntensityUVTransform
  );
  let transmissionUV = getMaterialUV(
    pbrMaterial.transmissionUVSet,
    pbrMaterial.transmissionUVTransform
  );
  let thicknessUV = getMaterialUV(pbrMaterial.thicknessUVSet, pbrMaterial.thicknessUVTransform);
  let clearcoatUV = getMaterialUV(pbrMaterial.clearcoatUVSet, pbrMaterial.clearcoatUVTransform);
  let clearcoatRoughnessUV = getMaterialUV(
    pbrMaterial.clearcoatRoughnessUVSet,
    pbrMaterial.clearcoatRoughnessUVTransform
  );
  let clearcoatNormalUV = getMaterialUV(
    pbrMaterial.clearcoatNormalUVSet,
    pbrMaterial.clearcoatNormalUVTransform
  );
  let sheenColorUV = getMaterialUV(
    pbrMaterial.sheenColorUVSet,
    pbrMaterial.sheenColorUVTransform
  );
  let sheenRoughnessUV = getMaterialUV(
    pbrMaterial.sheenRoughnessUVSet,
    pbrMaterial.sheenRoughnessUVTransform
  );
  let iridescenceUV = getMaterialUV(
    pbrMaterial.iridescenceUVSet,
    pbrMaterial.iridescenceUVTransform
  );
  let iridescenceThicknessUV = getMaterialUV(
    pbrMaterial.iridescenceThicknessUVSet,
    pbrMaterial.iridescenceThicknessUVTransform
  );
  let anisotropyUV = getMaterialUV(
    pbrMaterial.anisotropyUVSet,
    pbrMaterial.anisotropyUVTransform
  );
  let diffuseTransmissionUV = getMaterialUV(
    pbrMaterial.diffuseTransmissionUVSet,
    pbrMaterial.diffuseTransmissionUVTransform
  );
  let diffuseTransmissionColorUV = getMaterialUV(
    pbrMaterial.diffuseTransmissionColorUVSet,
    pbrMaterial.diffuseTransmissionColorUVTransform
  );
  let multiscatterColorUV = getMaterialUV(
    pbrMaterial.multiscatterColorUVSet,
    pbrMaterial.multiscatterColorUVTransform
  );

  // The albedo may be defined from a base texture or a flat color
  var baseColor: vec4<f32> = pbrMaterial.baseColorFactor * vertexColor;
  #ifdef HAS_BASECOLORMAP
  baseColor = SRGBtoLINEAR(
    textureSample(pbr_baseColorSampler, pbr_baseColorSamplerSampler, baseColorUV)
  ) * pbrMaterial.baseColorFactor * vertexColor;
  #endif

  #ifdef ALPHA_CUTOFF
  if (baseColor.a < pbrMaterial.alphaCutoff) {
    discard;
  }
  #endif

  var color = vec3<f32>(0.0, 0.0, 0.0);
  var transmission = 0.0;

  if (pbrMaterial.unlit != 0u) {
    color = baseColor.rgb;
  } else {
    // Metallic and Roughness material properties are packed together
    // In glTF, these factors can be specified by fixed scalar values
    // or from a metallic-roughness map
    var perceptualRoughness = pbrMaterial.metallicRoughnessValues.y;
    var metallic = pbrMaterial.metallicRoughnessValues.x;
    #ifdef HAS_METALROUGHNESSMAP
    // Roughness is stored in the 'g' channel, metallic is stored in the 'b' channel.
    // This layout intentionally reserves the 'r' channel for (optional) occlusion map data
    let mrSample = textureSample(
      pbr_metallicRoughnessSampler,
      pbr_metallicRoughnessSamplerSampler,
      metallicRoughnessUV
    );
    perceptualRoughness = mrSample.g * perceptualRoughness;
    metallic = mrSample.b * metallic;
    #endif
    perceptualRoughness = clamp(perceptualRoughness, c_MinRoughness, 1.0);
    metallic = clamp(metallic, 0.0, 1.0);
    let tbn = getTBN(normalUV);
    let n = getNormal(tbn, normalUV);                          // normal at surface point
    perceptualRoughness = widenSpecularRoughness(perceptualRoughness, n);
    let v = normalize(pbrProjection.camera - fragmentInputs.pbr_vPosition);  // Vector from surface point to camera
    let NdotV = clamp(abs(dot(n, v)), 0.001, 1.0);
    var useExtendedPBR = false;
    #ifdef USE_MATERIAL_EXTENSIONS
    useExtendedPBR =
      pbrMaterial.specularColorMapEnabled != 0 ||
      pbrMaterial.specularIntensityMapEnabled != 0 ||
      abs(pbrMaterial.specularIntensityFactor - 1.0) > 0.0001 ||
      maxComponent(abs(pbrMaterial.specularColorFactor - vec3f(1.0))) > 0.0001 ||
      abs(pbrMaterial.ior - 1.5) > 0.0001 ||
      pbrMaterial.dispersion > 0.0001 ||
      pbrMaterial.transmissionMapEnabled != 0 ||
      pbrMaterial.transmissionFactor > 0.0001 ||
      pbrMaterial.diffuseTransmissionMapEnabled != 0 ||
      pbrMaterial.diffuseTransmissionColorMapEnabled != 0 ||
      pbrMaterial.diffuseTransmissionFactor > 0.0001 ||
      pbrMaterial.multiscatterColorMapEnabled != 0 ||
      maxComponent(pbrMaterial.multiscatterColorFactor) > 0.0001 ||
      pbrMaterial.clearcoatMapEnabled != 0 ||
      pbrMaterial.clearcoatRoughnessMapEnabled != 0 ||
      pbrMaterial.clearcoatFactor > 0.0001 ||
      pbrMaterial.clearcoatRoughnessFactor > 0.0001 ||
      pbrMaterial.sheenColorMapEnabled != 0 ||
      pbrMaterial.sheenRoughnessMapEnabled != 0 ||
      maxComponent(pbrMaterial.sheenColorFactor) > 0.0001 ||
      pbrMaterial.sheenRoughnessFactor > 0.0001 ||
      pbrMaterial.iridescenceMapEnabled != 0 ||
      pbrMaterial.iridescenceFactor > 0.0001 ||
      abs(pbrMaterial.iridescenceIor - 1.3) > 0.0001 ||
      abs(pbrMaterial.iridescenceThicknessRange.x - 100.0) > 0.0001 ||
      abs(pbrMaterial.iridescenceThicknessRange.y - 400.0) > 0.0001 ||
      pbrMaterial.anisotropyMapEnabled != 0 ||
      pbrMaterial.anisotropyStrength > 0.0001 ||
      abs(pbrMaterial.anisotropyRotation) > 0.0001 ||
      length(pbrMaterial.anisotropyDirection - vec2f(1.0, 0.0)) > 0.0001;
    #endif

    if (!useExtendedPBR) {
      let alphaRoughness = perceptualRoughness * perceptualRoughness;

      let f0 = vec3<f32>(0.04);
      var diffuseColor = baseColor.rgb * (vec3<f32>(1.0) - f0);
      diffuseColor *= 1.0 - metallic;
      let specularColor = mix(f0, baseColor.rgb, metallic);

      let reflectance = max(max(specularColor.r, specularColor.g), specularColor.b);
      let reflectance90 = clamp(reflectance * 25.0, 0.0, 1.0);
      let specularEnvironmentR0 = specularColor;
      let specularEnvironmentR90 = vec3<f32>(1.0, 1.0, 1.0) * reflectance90;
      let reflection = -normalize(reflect(v, n));

      var pbrInfo = PBRInfo(
        0.0, // NdotL
        NdotV,
        0.0, // NdotH
        0.0, // LdotH
        0.0, // VdotH
        perceptualRoughness,
        metallic,
        specularEnvironmentR0,
        specularEnvironmentR90,
        alphaRoughness,
        diffuseColor,
        specularColor,
        n,
        v,
        n,
        n
      );

      #ifdef USE_LIGHTS
      PBRInfo_setAmbientLight(&pbrInfo);
      color += calculateFinalColor(pbrInfo, lighting.ambientColor);

      for (var i = 0; i < lighting.directionalLightCount; i++) {
        if (i < lighting.directionalLightCount) {
          PBRInfo_setDirectionalLight(&pbrInfo, lighting_getDirectionalLight(i).direction);
          color += calculateFinalColor(pbrInfo, lighting_getDirectionalLight(i).color);
        }
      }

      for (var i = 0; i < lighting.pointLightCount; i++) {
        if (i < lighting.pointLightCount) {
          PBRInfo_setPointLight(&pbrInfo, lighting_getPointLight(i));
          let attenuation = getPointLightAttenuation(
            lighting_getPointLight(i),
            distance(lighting_getPointLight(i).position, fragmentInputs.pbr_vPosition)
          );
          color += calculateFinalColor(pbrInfo, lighting_getPointLight(i).color / attenuation);
        }
      }

      for (var i = 0; i < lighting.spotLightCount; i++) {
        if (i < lighting.spotLightCount) {
          PBRInfo_setSpotLight(&pbrInfo, lighting_getSpotLight(i));
          let attenuation = getSpotLightAttenuation(
            lighting_getSpotLight(i),
            fragmentInputs.pbr_vPosition
          );
          color += calculateFinalColor(pbrInfo, lighting_getSpotLight(i).color / attenuation);
        }
      }
      #endif

      #ifdef USE_IBL
      if (pbrMaterial.IBLenabled != 0) {
        color += getIBLContribution(pbrInfo, n, reflection);
      }
      #endif

      #ifdef HAS_OCCLUSIONMAP
      if (pbrMaterial.occlusionMapEnabled != 0) {
        let ao = textureSample(pbr_occlusionSampler, pbr_occlusionSamplerSampler, occlusionUV).r;
        color = mix(color, color * ao, pbrMaterial.occlusionStrength);
      }
      #endif

      var emissive = pbrMaterial.emissiveFactor;
      #ifdef HAS_EMISSIVEMAP
      if (pbrMaterial.emissiveMapEnabled != 0u) {
        emissive *= SRGBtoLINEAR(
          textureSample(pbr_emissiveSampler, pbr_emissiveSamplerSampler, emissiveUV)
        ).rgb;
      }
      #endif
      color += emissive * pbrMaterial.emissiveStrength;

      #ifdef PBR_DEBUG
      color = mix(color, baseColor.rgb, pbrMaterial.scaleDiffBaseMR.y);
      color = mix(color, vec3<f32>(metallic), pbrMaterial.scaleDiffBaseMR.z);
      color = mix(color, vec3<f32>(perceptualRoughness), pbrMaterial.scaleDiffBaseMR.w);
      #endif

      return vec4<f32>(applySceneColorManagement(color), baseColor.a);
    }

    var specularIntensity = pbrMaterial.specularIntensityFactor;
    #ifdef HAS_SPECULARINTENSITYMAP
    if (pbrMaterial.specularIntensityMapEnabled != 0) {
      specularIntensity *= textureSample(
        pbr_specularIntensitySampler,
        pbr_specularIntensitySamplerSampler,
        specularIntensityUV
      ).a;
    }
    #endif

    var specularFactor = pbrMaterial.specularColorFactor;
    #ifdef HAS_SPECULARCOLORMAP
    if (pbrMaterial.specularColorMapEnabled != 0) {
      specularFactor *= SRGBtoLINEAR(
        textureSample(
          pbr_specularColorSampler,
          pbr_specularColorSamplerSampler,
          specularColorUV
        )
      ).rgb;
    }
    #endif

    transmission = pbrMaterial.transmissionFactor;
    #ifdef HAS_TRANSMISSIONMAP
    if (pbrMaterial.transmissionMapEnabled != 0) {
      transmission *= textureSample(
        pbr_transmissionSampler,
        pbr_transmissionSamplerSampler,
        transmissionUV
      ).r;
    }
    #endif
    transmission = clamp(transmission * (1.0 - metallic), 0.0, 1.0);
    var thickness = max(pbrMaterial.thicknessFactor, 0.0);
    #ifdef HAS_THICKNESSMAP
    thickness *= textureSample(
      pbr_thicknessSampler,
      pbr_thicknessSamplerSampler,
      thicknessUV
    ).g;
    #endif

    var diffuseTransmission = clamp(pbrMaterial.diffuseTransmissionFactor, 0.0, 1.0);
    #ifdef HAS_DIFFUSETRANSMISSIONMAP
    if (pbrMaterial.diffuseTransmissionMapEnabled != 0) {
      diffuseTransmission *= textureSample(
        pbr_diffuseTransmissionSampler,
        pbr_diffuseTransmissionSamplerSampler,
        diffuseTransmissionUV
      ).a;
    }
    #endif
    diffuseTransmission *= (1.0 - metallic) * (1.0 - transmission);
    var diffuseTransmissionColor = pbrMaterial.diffuseTransmissionColorFactor;
    #ifdef HAS_DIFFUSETRANSMISSIONCOLORMAP
    if (pbrMaterial.diffuseTransmissionColorMapEnabled != 0) {
      diffuseTransmissionColor *= SRGBtoLINEAR(
        textureSample(
          pbr_diffuseTransmissionColorSampler,
          pbr_diffuseTransmissionColorSamplerSampler,
          diffuseTransmissionColorUV
        )
      ).rgb;
    }
    #endif
    var multiscatterColor = pbrMaterial.multiscatterColorFactor;
    #ifdef HAS_MULTISCATTERCOLORMAP
    if (pbrMaterial.multiscatterColorMapEnabled != 0) {
      multiscatterColor *= SRGBtoLINEAR(
        textureSample(
          pbr_multiscatterColorSampler,
          pbr_multiscatterColorSamplerSampler,
          multiscatterColorUV
        )
      ).rgb;
    }
    #endif

    var clearcoatFactor = pbrMaterial.clearcoatFactor;
    var clearcoatRoughness = pbrMaterial.clearcoatRoughnessFactor;
    #ifdef HAS_CLEARCOATMAP
    if (pbrMaterial.clearcoatMapEnabled != 0) {
      clearcoatFactor *= textureSample(
        pbr_clearcoatSampler,
        pbr_clearcoatSamplerSampler,
        clearcoatUV
      ).r;
    }
    #endif
    #ifdef HAS_CLEARCOATROUGHNESSMAP
    if (pbrMaterial.clearcoatRoughnessMapEnabled != 0) {
      clearcoatRoughness *= textureSample(
        pbr_clearcoatRoughnessSampler,
        pbr_clearcoatRoughnessSamplerSampler,
        clearcoatRoughnessUV
      ).g;
    }
    #endif
    clearcoatFactor = clamp(clearcoatFactor, 0.0, 1.0);
    clearcoatRoughness = clamp(clearcoatRoughness, c_MinRoughness, 1.0);
    let clearcoatNormal = getClearcoatNormal(getTBN(clearcoatNormalUV), n, clearcoatNormalUV);
    clearcoatRoughness = widenSpecularRoughness(clearcoatRoughness, clearcoatNormal);

    var sheenColor = pbrMaterial.sheenColorFactor;
    var sheenRoughness = pbrMaterial.sheenRoughnessFactor;
    #ifdef HAS_SHEENCOLORMAP
    if (pbrMaterial.sheenColorMapEnabled != 0) {
      sheenColor *= SRGBtoLINEAR(
        textureSample(
          pbr_sheenColorSampler,
          pbr_sheenColorSamplerSampler,
          sheenColorUV
        )
      ).rgb;
    }
    #endif
    #ifdef HAS_SHEENROUGHNESSMAP
    if (pbrMaterial.sheenRoughnessMapEnabled != 0) {
      sheenRoughness *= textureSample(
        pbr_sheenRoughnessSampler,
        pbr_sheenRoughnessSamplerSampler,
        sheenRoughnessUV
      ).a;
    }
    #endif
    sheenRoughness = clamp(sheenRoughness, c_MinRoughness, 1.0);

    var iridescence = pbrMaterial.iridescenceFactor;
    #ifdef HAS_IRIDESCENCEMAP
    if (pbrMaterial.iridescenceMapEnabled != 0) {
      iridescence *= textureSample(
        pbr_iridescenceSampler,
        pbr_iridescenceSamplerSampler,
        iridescenceUV
      ).r;
    }
    #endif
    iridescence = clamp(iridescence, 0.0, 1.0);
    var iridescenceThickness = mix(
      pbrMaterial.iridescenceThicknessRange.x,
      pbrMaterial.iridescenceThicknessRange.y,
      0.5
    );
    #ifdef HAS_IRIDESCENCETHICKNESSMAP
    iridescenceThickness = mix(
      pbrMaterial.iridescenceThicknessRange.x,
      pbrMaterial.iridescenceThicknessRange.y,
      textureSample(
        pbr_iridescenceThicknessSampler,
        pbr_iridescenceThicknessSamplerSampler,
        iridescenceThicknessUV
      ).g
    );
    #endif

    var anisotropyStrength = clamp(pbrMaterial.anisotropyStrength, 0.0, 1.0);
    var anisotropyDirection = normalizeDirection(pbrMaterial.anisotropyDirection);
    #ifdef HAS_ANISOTROPYMAP
    if (pbrMaterial.anisotropyMapEnabled != 0) {
      let anisotropySample = textureSample(
        pbr_anisotropySampler,
        pbr_anisotropySamplerSampler,
        anisotropyUV
      ).rgb;
      anisotropyStrength *= anisotropySample.b;
      let mappedDirection = anisotropySample.rg * 2.0 - 1.0;
      if (length(mappedDirection) > 0.0001) {
        anisotropyDirection = normalize(mappedDirection);
      }
    }
    #endif
    anisotropyDirection = rotateDirection(anisotropyDirection, pbrMaterial.anisotropyRotation);
    var anisotropyTangent =
      normalize(tbn[0] * anisotropyDirection.x + tbn[1] * anisotropyDirection.y);
    if (length(anisotropyTangent) < 0.0001) {
      anisotropyTangent = normalize(tbn[0]);
    }
    // Roughness is authored as perceptual roughness; as is convention,
    // convert to material roughness by squaring the perceptual roughness [2].
    let alphaRoughness = perceptualRoughness * perceptualRoughness;

    let dielectricF0 = getDielectricF0(pbrMaterial.ior);
    var dielectricSpecularF0 = min(
      vec3f(dielectricF0) * specularFactor * specularIntensity,
      vec3f(1.0)
    );
    dielectricSpecularF0 = getIridescenceTint(
      iridescence,
      iridescenceThickness,
      NdotV,
      dielectricSpecularF0
    );
    var diffuseColor = baseColor.rgb * (vec3f(1.0) - dielectricSpecularF0);
    diffuseColor *= (1.0 - metallic) * (1.0 - transmission) * (1.0 - diffuseTransmission);
    var specularColor = mix(dielectricSpecularF0, baseColor.rgb, metallic);

    let clearcoatViewFresnel = dielectricSchlick(
      0.04,
      clamp(abs(dot(clearcoatNormal, v)), 0.0, 1.0)
    );
    let sheenDirectionalAlbedo = maxComponent(sheenColor) *
      (0.157 + 0.343 * (1.0 - NdotV)) * (1.0 - sheenRoughness * 0.5);
    let baseLayerEnergy = (1.0 - clearcoatFactor * clearcoatViewFresnel) *
      (1.0 - clamp(sheenDirectionalAlbedo, 0.0, 1.0));
    diffuseColor *= baseLayerEnergy;
    specularColor *= baseLayerEnergy;

    // Compute reflectance.
    let reflectance = max(max(specularColor.r, specularColor.g), specularColor.b);

    // For typical incident reflectance range (between 4% to 100%) set the grazing
    // reflectance to 100% for typical fresnel effect.
    // For very low reflectance range on highly diffuse objects (below 4%),
    // incrementally reduce grazing reflectance to 0%.
    let reflectance90 = clamp(reflectance * 25.0, 0.0, 1.0);
    let specularEnvironmentR0 = specularColor;
    let specularEnvironmentR90 = vec3<f32>(1.0, 1.0, 1.0) * reflectance90;
    let reflection = -normalize(reflect(v, n));

    var pbrInfo = PBRInfo(
      0.0, // NdotL
      NdotV,
      0.0, // NdotH
      0.0, // LdotH
      0.0, // VdotH
      perceptualRoughness,
      metallic,
      specularEnvironmentR0,
      specularEnvironmentR90,
      alphaRoughness,
      diffuseColor,
      specularColor,
      n,
      v,
      n,
      n
    );

    #ifdef USE_LIGHTS
    // Apply ambient light
    PBRInfo_setAmbientLight(&pbrInfo);
    color += calculateMaterialLightColor(
      pbrInfo,
      lighting.ambientColor,
      clearcoatNormal,
      clearcoatFactor,
      clearcoatRoughness,
      sheenColor,
      sheenRoughness,
      anisotropyTangent,
      anisotropyStrength
    );

    // Apply directional light
    for (var i = 0; i < lighting.directionalLightCount; i++) {
      if (i < lighting.directionalLightCount) {
        PBRInfo_setDirectionalLight(&pbrInfo, lighting_getDirectionalLight(i).direction);
        color += calculateMaterialLightColor(
          pbrInfo,
          lighting_getDirectionalLight(i).color,
          clearcoatNormal,
          clearcoatFactor,
          clearcoatRoughness,
          sheenColor,
          sheenRoughness,
          anisotropyTangent,
          anisotropyStrength
        );
        color += calculateDiffuseTransmissionLight(
          pbrInfo,
          lighting_getDirectionalLight(i).color,
          diffuseTransmissionColor,
          diffuseTransmission,
          multiscatterColor,
          thickness
        );
      }
    }

    // Apply point light
    for (var i = 0; i < lighting.pointLightCount; i++) {
      if (i < lighting.pointLightCount) {
        PBRInfo_setPointLight(&pbrInfo, lighting_getPointLight(i));
        let attenuation = getPointLightAttenuation(
          lighting_getPointLight(i),
          distance(lighting_getPointLight(i).position, fragmentInputs.pbr_vPosition)
        );
        color += calculateMaterialLightColor(
          pbrInfo,
          lighting_getPointLight(i).color / attenuation,
          clearcoatNormal,
          clearcoatFactor,
          clearcoatRoughness,
          sheenColor,
          sheenRoughness,
          anisotropyTangent,
          anisotropyStrength
        );
        color += calculateDiffuseTransmissionLight(
          pbrInfo,
          lighting_getPointLight(i).color / attenuation,
          diffuseTransmissionColor,
          diffuseTransmission,
          multiscatterColor,
          thickness
        );
      }
    }

    for (var i = 0; i < lighting.spotLightCount; i++) {
      if (i < lighting.spotLightCount) {
        PBRInfo_setSpotLight(&pbrInfo, lighting_getSpotLight(i));
        let attenuation = getSpotLightAttenuation(lighting_getSpotLight(i), fragmentInputs.pbr_vPosition);
        color += calculateMaterialLightColor(
          pbrInfo,
          lighting_getSpotLight(i).color / attenuation,
          clearcoatNormal,
          clearcoatFactor,
          clearcoatRoughness,
          sheenColor,
          sheenRoughness,
          anisotropyTangent,
          anisotropyStrength
        );
        color += calculateDiffuseTransmissionLight(
          pbrInfo,
          lighting_getSpotLight(i).color / attenuation,
          diffuseTransmissionColor,
          diffuseTransmission,
          multiscatterColor,
          thickness
        );
      }
    }
    #endif

    // Calculate lighting contribution from image based lighting source (IBL)
    #ifdef USE_IBL
    if (pbrMaterial.IBLenabled != 0) {
      color += getIBLContribution(
        pbrInfo,
        n,
        getAnisotropicReflection(pbrInfo, anisotropyTangent, anisotropyStrength)
      );
      color += calculateClearcoatIBLContribution(
        pbrInfo,
        clearcoatNormal,
        -normalize(reflect(v, clearcoatNormal)),
        clearcoatFactor,
        clearcoatRoughness
      );
      color += calculateDiffuseTransmissionIBL(
        pbrInfo,
        diffuseTransmissionColor,
        diffuseTransmission,
        multiscatterColor,
        thickness
      );
      color += sheenColor * pbrMaterial.scaleIBLAmbient.x * (1.0 - sheenRoughness) * 0.25;
    }
    #endif

    // Apply optional PBR terms for additional (optional) shading
    #ifdef HAS_OCCLUSIONMAP
    if (pbrMaterial.occlusionMapEnabled != 0) {
      let ao = textureSample(pbr_occlusionSampler, pbr_occlusionSamplerSampler, occlusionUV).r;
      color = mix(color, color * ao, pbrMaterial.occlusionStrength);
    }
    #endif

    var emissive = pbrMaterial.emissiveFactor;
    #ifdef HAS_EMISSIVEMAP
    if (pbrMaterial.emissiveMapEnabled != 0u) {
      emissive *= SRGBtoLINEAR(
        textureSample(pbr_emissiveSampler, pbr_emissiveSamplerSampler, emissiveUV)
      ).rgb;
    }
    #endif
    color += emissive * pbrMaterial.emissiveStrength;

    if (transmission > 0.0) {
      #ifdef USE_TRANSMISSION_FRAMEBUFFER
      let dielectricFresnel = getDielectricF0(pbrMaterial.ior);
      let transmissionFresnel = dielectricFresnel +
        (1.0 - dielectricFresnel) * pow(1.0 - NdotV, 5.0);
      let transmittedColor = getTransmittedSceneColor(
        fragmentInputs.pbr_vPosition,
        n,
        v,
        thickness,
        perceptualRoughness
      );
      color += transmittedColor * getVolumeAttenuation(thickness) *
        transmission * (1.0 - transmissionFresnel);
      #else
      color = mix(color, color * getVolumeAttenuation(thickness), transmission);
      #endif
    }

    // This section uses mix to override final color for reference app visualization
    // of various parameters in the lighting equation.
    #ifdef PBR_DEBUG
    // TODO: Figure out how to debug multiple lights

    // color = mix(color, F, pbr_scaleFGDSpec.x);
    // color = mix(color, vec3(G), pbr_scaleFGDSpec.y);
    // color = mix(color, vec3(D), pbr_scaleFGDSpec.z);
    // color = mix(color, specContrib, pbr_scaleFGDSpec.w);

    // color = mix(color, diffuseContrib, pbr_scaleDiffBaseMR.x);
    color = mix(color, baseColor.rgb, pbrMaterial.scaleDiffBaseMR.y);
    color = mix(color, vec3<f32>(metallic), pbrMaterial.scaleDiffBaseMR.z);
    color = mix(color, vec3<f32>(perceptualRoughness), pbrMaterial.scaleDiffBaseMR.w);
    #endif
  }

  #ifdef USE_TRANSMISSION_FRAMEBUFFER
  let alpha = clamp(baseColor.a, 0.0, 1.0);
  #else
  let alpha = clamp(baseColor.a * (1.0 - transmission), 0.0, 1.0);
  #endif
  return vec4<f32>(applySceneColorManagement(color), alpha);
}
`,dl=`layout(std140) uniform pbrProjectionUniforms {
  mat4 modelViewProjectionMatrix;
  mat4 modelMatrix;
  mat4 normalMatrix;
  vec3 camera;
} pbrProjection;
`,qx=`struct pbrProjectionUniforms {
  modelViewProjectionMatrix: mat4x4<f32>,
  modelMatrix: mat4x4<f32>,
  normalMatrix: mat4x4<f32>,
  camera: vec3<f32>
};

@group(0) @binding(auto) var<uniform> pbrProjection: pbrProjectionUniforms;
`,Yx={name:"pbrProjection",bindingLayout:[{name:"pbrProjection",group:0}],source:qx,vs:dl,fs:dl,getUniforms:n=>n,uniformTypes:{modelViewProjectionMatrix:"mat4x4<f32>",modelMatrix:"mat4x4<f32>",normalMatrix:"mat4x4<f32>",camera:"vec3<f32>"}},Na={props:{},uniforms:{},defaultUniforms:{unlit:!1,baseColorMapEnabled:!1,baseColorFactor:[1,1,1,1],normalMapEnabled:!1,normalScale:1,emissiveMapEnabled:!1,emissiveFactor:[0,0,0],metallicRoughnessValues:[1,1],metallicRoughnessMapEnabled:!1,occlusionMapEnabled:!1,occlusionStrength:1,alphaCutoffEnabled:!1,alphaCutoff:.5,IBLenabled:!1,scaleIBLAmbient:[1,1],scaleDiffBaseMR:[0,0,0,0],scaleFGDSpec:[0,0,0,0],specularColorFactor:[1,1,1],specularIntensityFactor:1,specularColorMapEnabled:!1,specularIntensityMapEnabled:!1,ior:1.5,transmissionFactor:0,transmissionMapEnabled:!1,thicknessFactor:0,attenuationDistance:1e9,attenuationColor:[1,1,1],clearcoatFactor:0,clearcoatRoughnessFactor:0,clearcoatMapEnabled:!1,clearcoatRoughnessMapEnabled:!1,sheenColorFactor:[0,0,0],sheenRoughnessFactor:0,sheenColorMapEnabled:!1,sheenRoughnessMapEnabled:!1,iridescenceFactor:0,iridescenceIor:1.3,iridescenceThicknessRange:[100,400],iridescenceMapEnabled:!1,anisotropyStrength:0,anisotropyRotation:0,anisotropyDirection:[1,0],anisotropyMapEnabled:!1,emissiveStrength:1,dispersion:0,baseColorUVSet:0,baseColorUVTransform:[1,0,0,0,1,0,0,0,1],metallicRoughnessUVSet:0,metallicRoughnessUVTransform:[1,0,0,0,1,0,0,0,1],normalUVSet:0,normalUVTransform:[1,0,0,0,1,0,0,0,1],occlusionUVSet:0,occlusionUVTransform:[1,0,0,0,1,0,0,0,1],emissiveUVSet:0,emissiveUVTransform:[1,0,0,0,1,0,0,0,1],specularColorUVSet:0,specularColorUVTransform:[1,0,0,0,1,0,0,0,1],specularIntensityUVSet:0,specularIntensityUVTransform:[1,0,0,0,1,0,0,0,1],transmissionUVSet:0,transmissionUVTransform:[1,0,0,0,1,0,0,0,1],thicknessUVSet:0,thicknessUVTransform:[1,0,0,0,1,0,0,0,1],clearcoatUVSet:0,clearcoatUVTransform:[1,0,0,0,1,0,0,0,1],clearcoatRoughnessUVSet:0,clearcoatRoughnessUVTransform:[1,0,0,0,1,0,0,0,1],clearcoatNormalUVSet:0,clearcoatNormalUVTransform:[1,0,0,0,1,0,0,0,1],sheenColorUVSet:0,sheenColorUVTransform:[1,0,0,0,1,0,0,0,1],sheenRoughnessUVSet:0,sheenRoughnessUVTransform:[1,0,0,0,1,0,0,0,1],iridescenceUVSet:0,iridescenceUVTransform:[1,0,0,0,1,0,0,0,1],iridescenceThicknessUVSet:0,iridescenceThicknessUVTransform:[1,0,0,0,1,0,0,0,1],anisotropyUVSet:0,anisotropyUVTransform:[1,0,0,0,1,0,0,0,1],bumpFactor:1,bumpMapEnabled:!1,diffuseTransmissionFactor:0,diffuseTransmissionMapEnabled:!1,diffuseTransmissionColorFactor:[1,1,1],diffuseTransmissionColorMapEnabled:!1,multiscatterColorFactor:[0,0,0],multiscatterColorMapEnabled:!1,scatterAnisotropy:0,bumpUVSet:0,bumpUVTransform:[1,0,0,0,1,0,0,0,1],diffuseTransmissionUVSet:0,diffuseTransmissionUVTransform:[1,0,0,0,1,0,0,0,1],diffuseTransmissionColorUVSet:0,diffuseTransmissionColorUVTransform:[1,0,0,0,1,0,0,0,1],multiscatterColorUVSet:0,multiscatterColorUVTransform:[1,0,0,0,1,0,0,0,1]},name:"pbrMaterial",firstBindingSlot:0,bindingLayout:[{name:"pbrMaterial",group:3},{name:"pbr_baseColorSampler",group:3},{name:"pbr_normalSampler",group:3},{name:"pbr_emissiveSampler",group:3},{name:"pbr_metallicRoughnessSampler",group:3},{name:"pbr_occlusionSampler",group:3},{name:"pbr_specularColorSampler",group:3},{name:"pbr_specularIntensitySampler",group:3},{name:"pbr_transmissionSampler",group:3},{name:"pbr_thicknessSampler",group:3},{name:"pbr_clearcoatSampler",group:3},{name:"pbr_clearcoatRoughnessSampler",group:3},{name:"pbr_clearcoatNormalSampler",group:3},{name:"pbr_sheenColorSampler",group:3},{name:"pbr_sheenRoughnessSampler",group:3},{name:"pbr_iridescenceSampler",group:3},{name:"pbr_iridescenceThicknessSampler",group:3},{name:"pbr_anisotropySampler",group:3},{name:"pbr_bumpSampler",group:3},{name:"pbr_diffuseTransmissionSampler",group:3},{name:"pbr_diffuseTransmissionColorSampler",group:3},{name:"pbr_multiscatterColorSampler",group:3}],dependencies:[Dx,Hx,Yx],source:Kx,vs:jx,fs:Xx,defines:{LIGHTING_FRAGMENT:!0,HAS_NORMALMAP:!1,HAS_EMISSIVEMAP:!1,HAS_OCCLUSIONMAP:!1,HAS_BASECOLORMAP:!1,HAS_METALROUGHNESSMAP:!1,HAS_SPECULARCOLORMAP:!1,HAS_SPECULARINTENSITYMAP:!1,HAS_TRANSMISSIONMAP:!1,HAS_THICKNESSMAP:!1,HAS_CLEARCOATMAP:!1,HAS_CLEARCOATROUGHNESSMAP:!1,HAS_CLEARCOATNORMALMAP:!1,HAS_SHEENCOLORMAP:!1,HAS_SHEENROUGHNESSMAP:!1,HAS_IRIDESCENCEMAP:!1,HAS_IRIDESCENCETHICKNESSMAP:!1,HAS_ANISOTROPYMAP:!1,HAS_BUMPMAP:!1,HAS_DIFFUSETRANSMISSIONMAP:!1,HAS_DIFFUSETRANSMISSIONCOLORMAP:!1,HAS_MULTISCATTERCOLORMAP:!1,USE_MATERIAL_EXTENSIONS:!1,ALPHA_CUTOFF:!1,USE_IBL:!1,PBR_DEBUG:!1},getUniforms:n=>n,uniformTypes:{unlit:"i32",baseColorMapEnabled:"i32",baseColorFactor:"vec4<f32>",normalMapEnabled:"i32",normalScale:"f32",emissiveMapEnabled:"i32",emissiveFactor:"vec3<f32>",metallicRoughnessValues:"vec2<f32>",metallicRoughnessMapEnabled:"i32",occlusionMapEnabled:"i32",occlusionStrength:"f32",alphaCutoffEnabled:"i32",alphaCutoff:"f32",specularColorFactor:"vec3<f32>",specularIntensityFactor:"f32",specularColorMapEnabled:"i32",specularIntensityMapEnabled:"i32",ior:"f32",transmissionFactor:"f32",transmissionMapEnabled:"i32",thicknessFactor:"f32",attenuationDistance:"f32",attenuationColor:"vec3<f32>",clearcoatFactor:"f32",clearcoatRoughnessFactor:"f32",clearcoatMapEnabled:"i32",clearcoatRoughnessMapEnabled:"i32",sheenColorFactor:"vec3<f32>",sheenRoughnessFactor:"f32",sheenColorMapEnabled:"i32",sheenRoughnessMapEnabled:"i32",iridescenceFactor:"f32",iridescenceIor:"f32",iridescenceThicknessRange:"vec2<f32>",iridescenceMapEnabled:"i32",anisotropyStrength:"f32",anisotropyRotation:"f32",anisotropyDirection:"vec2<f32>",anisotropyMapEnabled:"i32",emissiveStrength:"f32",dispersion:"f32",IBLenabled:"i32",scaleIBLAmbient:"vec2<f32>",scaleDiffBaseMR:"vec4<f32>",scaleFGDSpec:"vec4<f32>",baseColorUVSet:"i32",baseColorUVTransform:"mat3x3<f32>",metallicRoughnessUVSet:"i32",metallicRoughnessUVTransform:"mat3x3<f32>",normalUVSet:"i32",normalUVTransform:"mat3x3<f32>",occlusionUVSet:"i32",occlusionUVTransform:"mat3x3<f32>",emissiveUVSet:"i32",emissiveUVTransform:"mat3x3<f32>",specularColorUVSet:"i32",specularColorUVTransform:"mat3x3<f32>",specularIntensityUVSet:"i32",specularIntensityUVTransform:"mat3x3<f32>",transmissionUVSet:"i32",transmissionUVTransform:"mat3x3<f32>",thicknessUVSet:"i32",thicknessUVTransform:"mat3x3<f32>",clearcoatUVSet:"i32",clearcoatUVTransform:"mat3x3<f32>",clearcoatRoughnessUVSet:"i32",clearcoatRoughnessUVTransform:"mat3x3<f32>",clearcoatNormalUVSet:"i32",clearcoatNormalUVTransform:"mat3x3<f32>",sheenColorUVSet:"i32",sheenColorUVTransform:"mat3x3<f32>",sheenRoughnessUVSet:"i32",sheenRoughnessUVTransform:"mat3x3<f32>",iridescenceUVSet:"i32",iridescenceUVTransform:"mat3x3<f32>",iridescenceThicknessUVSet:"i32",iridescenceThicknessUVTransform:"mat3x3<f32>",anisotropyUVSet:"i32",anisotropyUVTransform:"mat3x3<f32>",bumpFactor:"f32",bumpMapEnabled:"i32",diffuseTransmissionFactor:"f32",diffuseTransmissionMapEnabled:"i32",diffuseTransmissionColorFactor:"vec3<f32>",diffuseTransmissionColorMapEnabled:"i32",multiscatterColorFactor:"vec3<f32>",multiscatterColorMapEnabled:"i32",scatterAnisotropy:"f32",bumpUVSet:"i32",bumpUVTransform:"mat3x3<f32>",diffuseTransmissionUVSet:"i32",diffuseTransmissionUVTransform:"mat3x3<f32>",diffuseTransmissionColorUVSet:"i32",diffuseTransmissionColorUVTransform:"mat3x3<f32>",multiscatterColorUVSet:"i32",multiscatterColorUVTransform:"mat3x3<f32>"}},Qx=25;var O;(function(n){n[n.Start=1]="Start",n[n.Move=2]="Move",n[n.End=4]="End",n[n.Cancel=8]="Cancel"})(O||(O={}));var J;(function(n){n[n.None=0]="None",n[n.Left=1]="Left",n[n.Right=2]="Right",n[n.Up=4]="Up",n[n.Down=8]="Down",n[n.Horizontal=3]="Horizontal",n[n.Vertical=12]="Vertical",n[n.All=15]="All"})(J||(J={}));var E;(function(n){n[n.Possible=1]="Possible",n[n.Began=2]="Began",n[n.Changed=4]="Changed",n[n.Ended=8]="Ended",n[n.Recognized=8]="Recognized",n[n.Cancelled=16]="Cancelled",n[n.Failed=32]="Failed"})(E||(E={}));const Zx="compute",Jx="auto",ni="manipulation",kr="none",Lo="pan-x",Co="pan-y";function eS(n){if(n.includes(kr))return kr;const e=n.includes(Lo),t=n.includes(Co);return e&&t?kr:e||t?e?Lo:Co:n.includes(ni)?ni:Jx}class tS{constructor(e,t){this.actions="",this.manager=e,this.set(t)}set(e){e===Zx&&(e=this.compute()),this.manager.element&&(this.manager.element.style.touchAction=e,this.actions=e)}update(){this.set(this.manager.options.touchAction)}compute(){let e=[];for(const t of this.manager.recognizers)t.options.enable&&(e=e.concat(t.getTouchAction()));return eS(e.join(" "))}}function ri(n){return n.trim().split(/\s+/g)}function _s(n,e,t){if(n)for(const r of ri(e))n.addEventListener(r,t,!1)}function ys(n,e,t){if(n)for(const r of ri(e))n.removeEventListener(r,t,!1)}function hl(n){return(n.ownerDocument||n).defaultView}function nS(n,e){let t=n;for(;t;){if(t===e)return!0;t=t.parentNode}return!1}function wd(n){const e=n.length;if(e===1)return{x:Math.round(n[0].clientX),y:Math.round(n[0].clientY)};let t=0,r=0,i=0;for(;i<e;)t+=n[i].clientX,r+=n[i].clientY,i++;return{x:Math.round(t/e),y:Math.round(r/e)}}function ml(n){const e=[];let t=0;for(;t<n.pointers.length;)e[t]={clientX:Math.round(n.pointers[t].clientX),clientY:Math.round(n.pointers[t].clientY)},t++;return{timeStamp:Date.now(),pointers:e,center:wd(e),deltaX:n.deltaX,deltaY:n.deltaY}}function Oa(n,e){const t=e.x-n.x,r=e.y-n.y;return Math.sqrt(t*t+r*r)}function Po(n,e){const t=e.clientX-n.clientX,r=e.clientY-n.clientY;return Math.sqrt(t*t+r*r)}function rS(n,e){const t=e.x-n.x,r=e.y-n.y;return Math.atan2(r,t)*180/Math.PI}function pl(n,e){const t=e.clientX-n.clientX,r=e.clientY-n.clientY;return Math.atan2(r,t)*180/Math.PI}function Fa(n,e){return n===e?J.None:Math.abs(n)>=Math.abs(e)?n<0?J.Left:J.Right:e<0?J.Up:J.Down}function iS(n,e){const t=e.center;let r=n.offsetDelta,i=n.prevDelta;const s=n.prevInput;return(e.eventType===O.Start||(s==null?void 0:s.eventType)===O.End)&&(i=n.prevDelta={x:(s==null?void 0:s.deltaX)||0,y:(s==null?void 0:s.deltaY)||0},r=n.offsetDelta={x:t.x,y:t.y}),{deltaX:i.x+(t.x-r.x),deltaY:i.y+(t.y-r.y)}}function Td(n,e,t){return{x:e/n||0,y:t/n||0}}function sS(n,e){return Po(e[0],e[1])/Po(n[0],n[1])}function oS(n,e){return pl(e[1],e[0])-pl(n[1],n[0])}function aS(n,e){const t=n.lastInterval||e,r=e.timeStamp-t.timeStamp;let i,s,o,a;if(e.eventType!==O.Cancel&&(r>Qx||t.velocity===void 0)){const c=e.deltaX-t.deltaX,l=e.deltaY-t.deltaY,u=Td(r,c,l);s=u.x,o=u.y,i=Math.abs(u.x)>Math.abs(u.y)?u.x:u.y,a=Fa(c,l),n.lastInterval=e}else i=t.velocity,s=t.velocityX,o=t.velocityY,a=t.direction;e.velocity=i,e.velocityX=s,e.velocityY=o,e.direction=a}function Bo(n,e){return"pointerId"in n?n.pointerId:e}function gl(n,e){n.movementOrigin=new Map(e.map((t,r)=>[Bo(t,r),{clientX:t.clientX,clientY:t.clientY}])),n.firstMovementTime=void 0}function cS(n,e){var i;const t=e.pointers.map(Bo);if(((i=n.movementOrigin)==null?void 0:i.size)===t.length&&t.every(s=>n.movementOrigin.has(s))||gl(n,e.pointers),e.distancePerPointer=e.pointers.map((s,o)=>Po(n.movementOrigin.get(t[o]),s)),e.eventType&O.Move&&e.distancePerPointer.some(s=>s>0)&&(n.firstMovementTime??(n.firstMovementTime=e.timeStamp)),e.movementDeltaTime=n.firstMovementTime===void 0?0:e.timeStamp-n.firstMovementTime,e.eventType&(O.End|O.Cancel)){const s=e.changedPointers.map(o=>Bo(o,e.pointers.indexOf(o)));gl(n,e.pointers.filter((o,a)=>!s.includes(t[a])))}}function lS(n,e){const{session:t}=n,{pointers:r}=e,{length:i}=r;t.firstInput||(t.firstInput=ml(e)),i>1&&!t.firstMultiple?t.firstMultiple=ml(e):i===1&&(t.firstMultiple=!1);const{firstInput:s,firstMultiple:o}=t,a=o?o.center:s.center,c=e.center=wd(r);e.timeStamp=Date.now(),e.deltaTime=e.timeStamp-s.timeStamp,cS(t,e),e.angle=rS(a,c),e.distance=Oa(a,c);const{deltaX:l,deltaY:u}=iS(t,e);e.deltaX=l,e.deltaY=u,e.offsetDirection=Fa(e.deltaX,e.deltaY);const d=Td(e.deltaTime,e.deltaX,e.deltaY);e.overallVelocityX=d.x,e.overallVelocityY=d.y,e.overallVelocity=Math.abs(d.x)>Math.abs(d.y)?d.x:d.y,e.scale=o?sS(o.pointers,r):1,e.rotation=o?oS(o.pointers,r):0,e.maxPointers=t.prevInput?e.pointers.length>t.prevInput.maxPointers?e.pointers.length:t.prevInput.maxPointers:e.pointers.length;let h=n.element;return nS(e.srcEvent.target,h)&&(h=e.srcEvent.target),e.target=h,aS(t,e),e}function uS(n,e,t){const r=t.pointers.length,i=t.changedPointers.length,s=e&O.Start&&r-i===0,o=e&(O.End|O.Cancel)&&r-i===0;t.isFirst=!!s,t.isFinal=!!o,s&&(n.session={}),t.eventType=e;const a=lS(n,t);n.emit("hammer.input",a),n.recognize(a),n.session.prevInput=a}let fS=class{constructor(e){this.evEl="",this.evWin="",this.evTarget="",this.domHandler=t=>{this.manager.options.enable&&this.handler(t)},this.manager=e,this.element=e.element,this.target=e.options.inputTarget||e.element}callback(e,t){uS(this.manager,e,t)}init(){_s(this.element,this.evEl,this.domHandler),_s(this.target,this.evTarget,this.domHandler),_s(hl(this.element),this.evWin,this.domHandler)}destroy(){ys(this.element,this.evEl,this.domHandler),ys(this.target,this.evTarget,this.domHandler),ys(hl(this.element),this.evWin,this.domHandler)}};const dS={pointerdown:O.Start,pointermove:O.Move,pointerup:O.End,pointercancel:O.Cancel,pointerout:O.Cancel},hS="pointerdown",mS="pointermove pointerup pointercancel";class pS extends fS{constructor(e){super(e),this.evEl=hS,this.evWin=mS,this.store=this.manager.session.pointerEvents=[],this.init()}handler(e){const{store:t}=this;let r=!1;const i=dS[e.type],s=e.pointerType,o=s==="touch";let a=t.findIndex(c=>c.pointerId===e.pointerId);i&O.Start&&(e.buttons||o)?a<0&&(t.push(e),a=t.length-1):i&(O.End|O.Cancel)&&(r=!0),!(a<0)&&(t[a]=e,this.callback(i,{pointers:t,changedPointers:[e],eventType:i,pointerType:s,srcEvent:e}),r&&t.splice(a,1))}}const gS=["","webkit","Moz","MS","ms","o"];function bS(n,e){const t=e[0].toUpperCase()+e.slice(1);for(const r of gS){const i=r?r+t:e;if(i in n)return i}}const _S=1,bl=2,_l={touchAction:"compute",enable:!0,inputTarget:null,cssProps:{userSelect:"none",userDrag:"none",touchCallout:"none",tapHighlightColor:"rgba(0,0,0,0)"}};class yS{constructor(e,t){this.options={..._l,...t,cssProps:{..._l.cssProps,...t.cssProps},inputTarget:t.inputTarget||e},this.handlers={},this.session={},this.recognizers=[],this.oldCssProps={},this.element=e,this.input=new pS(this),this.touchAction=new tS(this,this.options.touchAction),this.toggleCssProps(!0)}set(e){return Object.assign(this.options,e),e.touchAction&&this.touchAction.update(),e.inputTarget&&(this.input.destroy(),this.input.target=e.inputTarget,this.input.init()),this}stop(e){this.session.stopped=e?bl:_S}recognize(e){const{session:t}=this;if(t.stopped)return;this.session.prevented&&e.srcEvent.preventDefault();let r;const{recognizers:i}=this;let{curRecognizer:s}=t;(!s||s&&s.state&E.Recognized)&&(s=t.curRecognizer=null);let o=0;for(;o<i.length;)r=i[o],t.stopped!==bl&&(!s||r===s||r.canRecognizeWith(s))?r.recognize(e):r.reset(),!s&&r.state&(E.Began|E.Changed|E.Ended)&&(s=t.curRecognizer=r),o++}get(e){const{recognizers:t}=this;for(let r=0;r<t.length;r++)if(t[r].options.event===e)return t[r];return null}add(e){if(Array.isArray(e)){for(const r of e)this.add(r);return this}const t=this.get(e.options.event);return t&&this.remove(t),this.recognizers.push(e),e.manager=this,this.touchAction.update(),e}remove(e){if(Array.isArray(e)){for(const r of e)this.remove(r);return this}const t=typeof e=="string"?this.get(e):e;if(t){const{recognizers:r}=this,i=r.indexOf(t);i!==-1&&(r.splice(i,1),this.touchAction.update())}return this}on(e,t){if(!e||!t)return;const{handlers:r}=this;for(const i of ri(e))r[i]=r[i]||[],r[i].push(t)}off(e,t){if(!e)return;const{handlers:r}=this;for(const i of ri(e))t?r[i]&&r[i].splice(r[i].indexOf(t),1):delete r[i]}emit(e,t){const r=this.handlers[e]&&this.handlers[e].slice();if(!r||!r.length)return;const i=t;i.type=e,i.preventDefault=function(){t.srcEvent.preventDefault()};let s=0;for(;s<r.length;)r[s](i),s++}destroy(){this.toggleCssProps(!1),this.handlers={},this.session={},this.input.destroy(),this.element=null}toggleCssProps(e){const{element:t}=this;if(t){for(const[r,i]of Object.entries(this.options.cssProps)){const s=bS(t.style,r);e?(this.oldCssProps[s]=t.style[s],t.style[s]=i):t.style[s]=this.oldCssProps[s]||""}e||(this.oldCssProps={})}}}let vS=1;function xS(){return vS++}function yl(n){return n&E.Cancelled?"cancel":n&E.Ended?"end":n&E.Changed?"move":n&E.Began?"start":""}class Ua{constructor(e){this.options=e,this.id=xS(),this.state=E.Possible,this.simultaneous={},this.requireFail=[]}set(e){return Object.assign(this.options,e),this.manager.touchAction.update(),this}recognizeWith(e){if(Array.isArray(e)){for(const i of e)this.recognizeWith(i);return this}let t;if(typeof e=="string"){if(t=this.manager.get(e),!t)throw new Error(`Cannot find recognizer ${e}`)}else t=e;const{simultaneous:r}=this;return r[t.id]||(r[t.id]=t,t.recognizeWith(this)),this}dropRecognizeWith(e){if(Array.isArray(e)){for(const r of e)this.dropRecognizeWith(r);return this}let t;return typeof e=="string"?t=this.manager.get(e):t=e,t&&delete this.simultaneous[t.id],this}requireFailure(e){if(Array.isArray(e)){for(const i of e)this.requireFailure(i);return this}let t;if(typeof e=="string"){if(t=this.manager.get(e),!t)throw new Error(`Cannot find recognizer ${e}`)}else t=e;const{requireFail:r}=this;return r.indexOf(t)===-1&&(r.push(t),t.requireFailure(this)),this}dropRequireFailure(e){if(Array.isArray(e)){for(const r of e)this.dropRequireFailure(r);return this}let t;if(typeof e=="string"?t=this.manager.get(e):t=e,t){const r=this.requireFail.indexOf(t);r>-1&&this.requireFail.splice(r,1)}return this}hasRequireFailures(){return!!this.requireFail.find(e=>e.options.enable)}canRecognizeWith(e){return!!this.simultaneous[e.id]}emit(e){if(!e)return;const{state:t}=this;t<E.Ended&&this.manager.emit(this.options.event+yl(t),e),this.manager.emit(this.options.event,e),e.additionalEvent&&this.manager.emit(e.additionalEvent,e),t>=E.Ended&&this.manager.emit(this.options.event+yl(t),e)}tryEmit(e){this.canEmit()?this.emit(e):this.state=E.Failed}canEmit(){let e=0;for(;e<this.requireFail.length;){if(!(this.requireFail[e].state&(E.Failed|E.Possible)))return!1;e++}return!0}recognize(e){const t={...e};if(!this.options.enable){this.reset(),this.state=E.Failed;return}this.state&(E.Recognized|E.Cancelled|E.Failed)&&(this.state=E.Possible),this.state=this.process(t),this.state&(E.Began|E.Changed|E.Ended|E.Cancelled)&&this.tryEmit(t)}getEventNames(){return[this.options.event]}reset(){}}function SS(n){return Math.abs(((n+180)%360+360)%360-180)}function wS(n,e){return(e.distance===void 0||n.distance>=e.distance)&&(e.distancePerPointer===void 0||n.distancePerPointer.length>0&&n.distancePerPointer.every(t=>t>=e.distancePerPointer))&&(e.movementDeltaTime===void 0||n.movementDeltaTime>=e.movementDeltaTime)&&(e.rotation===void 0||SS(n.rotation)>=e.rotation)&&(e.scale===void 0||Math.abs(n.scale-1)>=e.scale)}class TS extends Ua{attrTest(e){const t=this.options.pointers;return t===0||e.pointers.length===t}coherentTest(e){const t=this.options.coherent;return!(t!=null&&t.length)||t.some(r=>wS(e,r))}process(e){const{state:t}=this,{eventType:r}=e,i=t&(E.Began|E.Changed),s=this.attrTest(e);return i&&(r&O.Cancel||!s)?t|E.Cancelled:i||s?r&O.End?t|E.Ended:t&E.Began?t|E.Changed:E.Began:E.Failed}}const ES=["","start","move","end","cancel"];class aP extends Ua{constructor(e={}){super({enable:!0,event:"doubleclickdrag",pointers:1,interval:500,time:350,threshold:28,dragThreshold:1,pixelsPerScale:120,...e}),this._tapStart=null,this._lastTap=null,this._drag=null,this._emittedStart=!1}getTouchAction(){return[ni]}getEventNames(){return ES.map(e=>this.options.event+e)}process(e){const{options:t}=this;return e.pointers.length===t.pointers?e.eventType&O.Start?this._handleStart(e):e.eventType&O.Move?this._handleMove(e):e.eventType&O.Cancel?this._handleEnd(e,!0):e.eventType&O.End?this._handleEnd(e,!1):E.Failed:(this.reset(),E.Failed)}reset(){this._tapStart=null,this._lastTap=null,this._drag=null,this._emittedStart=!1}emit(e){var t;if(e){if(this.state===E.Began){if(!((t=this._drag)!=null&&t.active)||this._emittedStart)return;this._emittedStart=!0,this.manager.emit(`${this.options.event}start`,e),this.manager.emit(this.options.event,e);return}if(this.state===E.Changed){if(!this._emittedStart)return;this.manager.emit(`${this.options.event}move`,e),this.manager.emit(this.options.event,e);return}if(this.state===E.Ended){if(!this._emittedStart)return;this.manager.emit(this.options.event,e),this.manager.emit(`${this.options.event}end`,e),this._emittedStart=!1;return}if(this.state===E.Cancelled){if(!this._emittedStart)return;this.manager.emit(this.options.event,e),this.manager.emit(`${this.options.event}cancel`,e),this._emittedStart=!1}}}_handleStart(e){const t=this._getPointerId(e);return this._lastTap&&this._isTapMatch(e,this._lastTap)?(this._tapStart=null,this._lastTap=null,this._drag={startCenter:e.center,pointerId:t,active:!1},this._emittedStart=!1,E.Began):(this._tapStart={center:e.center,timeStamp:e.timeStamp,pointerId:t},this._lastTap=null,this._drag=null,this._emittedStart=!1,E.Failed)}_handleMove(e){if(!this._drag||!this._isSamePointer(e,this._drag.pointerId))return E.Failed;const t=this._drag.startCenter.y-e.center.y;return!this._drag.active&&Math.abs(t)<this.options.dragThreshold?E.Began:(this._drag.active=!0,e.scale=Math.pow(2,t/this.options.pixelsPerScale),this._emittedStart?E.Changed:E.Began)}_handleEnd(e,t){if(this._drag&&this._isSamePointer(e,this._drag.pointerId)){const{active:r,startCenter:i}=this._drag;if(this._drag=null,this._tapStart=null,this._lastTap=null,!r)return this._emittedStart=!1,E.Failed;const s=i.y-e.center.y;return e.scale=Math.pow(2,s/this.options.pixelsPerScale),t?E.Cancelled:E.Ended}return!this._tapStart||!this._isSamePointer(e,this._tapStart.pointerId)?(t&&this.reset(),E.Failed):(this._isValidTap(e)?this._lastTap={center:e.center,timeStamp:e.timeStamp,pointerId:this._tapStart.pointerId}:this._lastTap=null,this._tapStart=null,E.Failed)}_isTapMatch(e,t){return e.timeStamp-t.timeStamp<=this.options.interval&&Oa(e.center,t.center)<=this.options.threshold}_isValidTap(e){return e.deltaTime<=this.options.time&&e.distance<=this.options.threshold}_getPointerId(e){return"pointerId"in e.srcEvent?e.srcEvent.pointerId:null}_isSamePointer(e,t){return t===null||this._getPointerId(e)===t}}class cP extends Ua{constructor(e={}){super({enable:!0,event:"tap",pointers:1,taps:1,interval:300,time:250,threshold:9,posThreshold:10,...e}),this.pTime=null,this.pCenter=null,this._timer=null,this._input=null,this.count=0}getTouchAction(){return[ni]}process(e){const{options:t}=this,r=e.pointers.length===t.pointers,i=e.distance<t.threshold,s=e.deltaTime<t.time;if(this.reset(),e.eventType&O.Start&&this.count===0)return this.failTimeout();if(i&&s&&r){if(e.eventType!==O.End)return this.failTimeout();const o=this.pTime?e.timeStamp-this.pTime<t.interval:!0,a=!this.pCenter||Oa(this.pCenter,e.center)<t.posThreshold;if(this.pTime=e.timeStamp,this.pCenter=e.center,!a||!o?this.count=1:this.count+=1,this._input=e,this.count%t.taps===0)return this.hasRequireFailures()?(this._timer=setTimeout(()=>{this.state=E.Recognized,this.tryEmit(this._input)},t.interval),E.Began):E.Recognized}return E.Failed}failTimeout(){return this._timer=setTimeout(()=>{this.state=E.Failed},this.options.interval),E.Failed}reset(){clearTimeout(this._timer)}emit(e){this.state===E.Recognized&&(e.tapCount=this.count,this.manager.emit(this.options.event,e))}}class Ed extends TS{constructor(){super(...arguments),this.wheelSession=null,this.wheelSessionUnsubscribe=null,this.handleWheelSessionEvent=e=>{e.device==="trackpad"&&this.handleTrackpadEvent(e)}}set(e){var i;const{wheelSession:t,...r}=e;return t&&t!==this.wheelSession&&((i=this.wheelSessionUnsubscribe)==null||i.call(this),this.wheelSessionUnsubscribe=null,this.wheelSession=t),super.set(r),this.updateWheelSessionSubscription(),this}getTrackpadInput(e,t={}){const{srcEvent:r}=e,i=t.deltaX??e.deltaX,s=t.deltaY??e.deltaY,o=Fa(i,s),a=Math.sqrt(e.deltaX*e.deltaX+e.deltaY*e.deltaY),c=r;return{pointers:[c,c],changedPointers:[c,c],pointerType:"trackpad",srcEvent:c,eventType:e.eventType,timeStamp:e.timeStamp,deltaTime:e.deltaTime,center:e.center,deltaX:i,deltaY:s,angle:Math.atan2(s,i)*180/Math.PI,distance:Math.sqrt(i*i+s*s),distancePerPointer:[a,a],movementDeltaTime:e.deltaTime,scale:1,rotation:0,direction:o,offsetDirection:o,velocity:e.velocity,velocityX:e.velocityX,velocityY:e.velocityY,overallVelocity:e.overallVelocity,overallVelocityX:e.overallVelocityX,overallVelocityY:e.overallVelocityY,maxPointers:2,target:r.target||this.manager.element,additionalEvent:"",...t}}updateWheelSessionSubscription(){const e=!!(this.wheelSession&&this.options.enable&&this.options.trackpad&&this.options.pointers===2);e&&!this.wheelSessionUnsubscribe?this.wheelSessionUnsubscribe=this.wheelSession.on(this.handleWheelSessionEvent):!e&&this.wheelSessionUnsubscribe&&(this.wheelSessionUnsubscribe(),this.wheelSessionUnsubscribe=null)}}const AS=["","start","move","end","cancel","up","down","left","right"];class lP extends Ed{constructor(e={}){super({enable:!0,pointers:1,event:"pan",threshold:10,direction:J.All,trackpad:!1,coherent:[],...e}),this.trackpadGesture=!1,this.pX=null,this.pY=null}getTouchAction(){const{options:{direction:e}}=this,t=[];return e&J.Horizontal&&t.push(Co),e&J.Vertical&&t.push(Lo),t}getEventNames(){return AS.map(e=>this.options.event+e)}directionTest(e){const{options:t}=this;let r=!0,{distance:i}=e,{direction:s}=e;const o=e.deltaX,a=e.deltaY;return s&t.direction||(t.direction&J.Horizontal?(s=o===0?J.None:o<0?J.Left:J.Right,r=o!==this.pX,i=Math.abs(e.deltaX)):(s=a===0?J.None:a<0?J.Up:J.Down,r=a!==this.pY,i=Math.abs(e.deltaY))),e.direction=s,r&&i>t.threshold&&!!(s&t.direction)}attrTest(e){var i;const t=!!(this.state&E.Began),r=!((i=this.options.coherent)!=null&&i.length&&e.eventType&(O.End|O.Cancel));return super.attrTest(e)&&(t||r&&this.coherentTest(e)&&this.directionTest(e))}emit(e){this.pX=e.deltaX,this.pY=e.deltaY;const t=J[e.direction].toLowerCase();t&&(e.additionalEvent=this.options.event+t),super.emit(e)}handleTrackpadEvent(e){e.isFirst&&(this.trackpadGesture=!e.srcEvent.ctrlKey,!this.trackpadGesture&&this.state&(E.Recognized|E.Cancelled|E.Failed)&&(this.state=E.Possible)),this.trackpadGesture&&(this.recognize(this.getTrackpadInput(e,{deltaX:-e.deltaX,deltaY:-e.deltaY,velocity:-e.velocity,velocityX:-e.velocityX,velocityY:-e.velocityY,overallVelocity:-e.overallVelocity,overallVelocityX:-e.overallVelocityX,overallVelocityY:-e.overallVelocityY})),e.isFinal&&(this.trackpadGesture=!1))}}const RS=["","start","move","end","cancel","in","out"];class uP extends Ed{constructor(e={}){super({enable:!0,event:"pinch",threshold:0,pointers:2,trackpad:!1,coherent:[],...e}),this.trackpadGesture=!1}getTouchAction(){return[kr]}getEventNames(){return RS.map(e=>this.options.event+e)}attrTest(e){var s;const t=!!((s=this.options.coherent)!=null&&s.length),r=!!(this.state&E.Began),i=!(t&&e.eventType&(O.End|O.Cancel));return super.attrTest(e)&&(r||i&&(t?this.coherentTest(e):Math.abs(e.scale-1)>this.options.threshold))}emit(e){if(e.scale!==1){const t=e.scale<1?"in":"out";e.additionalEvent=this.options.event+t}super.emit(e)}handleTrackpadEvent(e){e.isFirst&&(this.trackpadGesture=e.srcEvent.ctrlKey,!this.trackpadGesture&&this.state&(E.Recognized|E.Cancelled|E.Failed)&&(this.state=E.Possible)),this.trackpadGesture&&(this.recognize(this.getTrackpadInput(e,{deltaX:0,deltaY:0,velocity:0,velocityX:0,velocityY:0,overallVelocity:0,overallVelocityX:0,overallVelocityY:0,scale:Math.exp(-e.deltaY/100)})),e.isFinal&&(this.trackpadGesture=!1))}}class Ui{constructor(e,t,r){this.element=e,this.callback=t,this.options=r}listen(e,t){t?this.element.addEventListener(e,this.handleEvent,{passive:!1}):this.element.removeEventListener(e,this.handleEvent)}}const IS=typeof navigator<"u"&&navigator.userAgent?navigator.userAgent.toLowerCase():"",MS=IS.indexOf("firefox")!==-1,LS=40,CS=.25;class PS extends Ui{constructor(e,t,r){var i;r.enable=r.enable??!1,super(e,t,r),this.handleEvent=s=>{var a;if(!this.options.enable)return;let o=s.deltaY;globalThis.WheelEvent&&(MS&&s.deltaMode===globalThis.WheelEvent.DOM_DELTA_PIXEL&&(o/=globalThis.devicePixelRatio),s.deltaMode===globalThis.WheelEvent.DOM_DELTA_LINE&&(o*=LS)),s.shiftKey&&o&&(o=o*CS),this.callback({type:"wheel",center:{x:s.clientX,y:s.clientY},delta:-o,device:((a=this.options.wheelSession)==null?void 0:a.device)??"unknown",srcEvent:s,pointerType:"mouse",target:s.target})},r.enable&&(this.wheelSessionUnsubscribe=(i=this.options.wheelSession)==null?void 0:i.on(()=>{}),this.listen("wheel",!0))}destroy(){var e;this.listen("wheel",!1),(e=this.wheelSessionUnsubscribe)==null||e.call(this),this.wheelSessionUnsubscribe=void 0}enableEventType(e,t){var r,i;e==="wheel"&&this.options.enable!==t&&(this.options.enable=t,t&&!this.wheelSessionUnsubscribe&&(this.wheelSessionUnsubscribe=(r=this.options.wheelSession)==null?void 0:r.on(()=>{})),this.listen("wheel",t),t||((i=this.wheelSessionUnsubscribe)==null||i.call(this),this.wheelSessionUnsubscribe=void 0))}}const BS=4.000244140625,vl=40,NS=0,OS=1,FS=40,xl=40,US=120,DS={classificationDelay:32,endDelay:80};class kS{constructor(e,t={}){var r;this.subscriptions=new Map,this.session=null,this.classificationTimer=null,this.endTimer=null,this.pressedControlKeys=new Set,this.listeningForControlKeys=!1,this.handleEvent=i=>{if(!this.hasSubscribers)return"unknown";const s=VS(i,this.pressedControlKeys.size>0);let o=this.session;if(o&&s.timeStamp-o.lastTimeStamp>=this.options.endDelay){if(this.end(),!this.hasSubscribers)return"unknown";o=null}o?(this.scheduleEnd(),this.addSample(o,s)):(o=this.startPendingSession(s),this.scheduleEnd());let{device:a}=o;return a==="unknown"&&(a=vs(o.samples,!1),a!=="unknown"&&this.begin(o,a)),a},this.finishClassification=()=>{if(this.classificationTimer=null,!this.session||this.session.device!=="unknown")return;const i=this.session,s=vs(i.samples,!0);this.begin(i,s==="unknown"?"mouse":s)},this.end=()=>{if(!this.session)return;if(this.session.device==="unknown"){const s=this.session,o=vs(s.samples,!0);this.begin(s,o==="unknown"?"mouse":o)}if(!this.session)return;const i=this.session;this.emit(O.End,i.lastEvent),this.reset()},this.handleKeyDown=i=>{i.key==="Control"&&this.pressedControlKeys.add(i.code||i.key)},this.handleKeyUp=i=>{i.key==="Control"&&(i.code?this.pressedControlKeys.delete(i.code):this.pressedControlKeys.clear())},this.handleWindowBlur=()=>{this.pressedControlKeys.clear()},this.element=e,this.options={...DS,...t},(r=this.element)==null||r.addEventListener("wheel",this.handleEvent,{passive:!0})}get hasSubscribers(){return this.subscriptions.size>0}get device(){var e;return((e=this.session)==null?void 0:e.device)??"unknown"}on(e){const t={listener:e};return this.subscriptions.set(e,t),this.updateControlKeyEventListeners(),()=>{this.subscriptions.get(e)===t&&this.off(e)}}off(e){this.subscriptions.delete(e),this.updateControlKeyEventListeners(),this.hasSubscribers||this.reset()}cancel(){const e=this.session;e&&e.device!=="unknown"&&this.emit(O.Cancel,e.lastEvent),this.reset()}destroy(){var e;this.cancel(),this.subscriptions.clear(),this.updateControlKeyEventListeners(),(e=this.element)==null||e.removeEventListener("wheel",this.handleEvent)}startPendingSession(e){const t={samples:[e],device:"unknown",firstTimeStamp:e.timeStamp,lastTimeStamp:e.timeStamp,totalDeltaX:e.deltaX,totalDeltaY:e.deltaY,velocityX:0,velocityY:0,lastEvent:e.event};return this.session=t,this.classificationTimer=globalThis.setTimeout(this.finishClassification,this.options.classificationDelay),t}addSample(e,t){if(e.samples.push(t),e.lastTimeStamp=t.timeStamp,e.lastEvent=t.event,e.totalDeltaX+=t.deltaX,e.totalDeltaY+=t.deltaY,e.device!=="unknown"){const r=e.samples[e.samples.length-2],i=t.timeStamp-r.timeStamp;e.velocityX=i>0?t.deltaX/i:0,e.velocityY=i>0?t.deltaY/i:0,this.emit(O.Move,t.event,{velocityX:e.velocityX,velocityY:e.velocityY})}}begin(e,t){e.device=t,this.clearClassificationTimer(),this.emit(O.Start,e.samples[0].event);const r=e.lastTimeStamp-e.firstTimeStamp;e.velocityX=r>0?e.totalDeltaX/r:0,e.velocityY=r>0?e.totalDeltaY/r:0,this.emit(O.Move,e.lastEvent,{velocityX:e.velocityX,velocityY:e.velocityY})}scheduleEnd(){this.clearEndTimer(),this.endTimer=globalThis.setTimeout(this.end,this.options.endDelay)}emit(e,t,r){const i=this.session;if(!i||i.device==="unknown")return;const s=e===O.Start,o=e===O.End||e===O.Cancel,a=s?i.firstTimeStamp:i.lastTimeStamp,c=s?0:Math.max(0,a-i.firstTimeStamp),l=s?0:i.totalDeltaX,u=s?0:i.totalDeltaY,d=c>0?l/c:0,h=c>0?u/c:0,m=s?0:(r==null?void 0:r.velocityX)??i.velocityX,p=s?0:(r==null?void 0:r.velocityY)??i.velocityY,g={eventType:e,device:i.device,srcEvent:t,timeStamp:a,center:{x:t.clientX,y:t.clientY},deltaX:l,deltaY:u,deltaTime:c,velocity:Math.abs(m)>Math.abs(p)?m:p,velocityX:m,velocityY:p,overallVelocity:Math.abs(d)>Math.abs(h)?d:h,overallVelocityX:d,overallVelocityY:h,isFirst:s,isFinal:o};for(const{listener:b}of[...this.subscriptions.values()])b(g)}reset(){this.clearClassificationTimer(),this.clearEndTimer(),this.session=null}clearClassificationTimer(){this.classificationTimer!==null&&(globalThis.clearTimeout(this.classificationTimer),this.classificationTimer=null)}clearEndTimer(){this.endTimer!==null&&(globalThis.clearTimeout(this.endTimer),this.endTimer=null)}updateControlKeyEventListeners(){const e=this.hasSubscribers,t=$S();!t||e===this.listeningForControlKeys||(this.listeningForControlKeys=e,e?(t.addEventListener("keydown",this.handleKeyDown,!0),t.addEventListener("keyup",this.handleKeyUp,!0),t.addEventListener("blur",this.handleWindowBlur)):(t.removeEventListener("keydown",this.handleKeyDown,!0),t.removeEventListener("keyup",this.handleKeyUp,!0),t.removeEventListener("blur",this.handleWindowBlur),this.pressedControlKeys.clear()))}}function $S(){var n;return typeof window<"u"?window:(n=globalThis.document)==null?void 0:n.defaultView}function VS(n,e){let t=n.deltaX,r=n.deltaY;return n.deltaMode===OS&&(t*=vl,r*=vl),{event:n,timeStamp:n.timeStamp,deltaX:t,deltaY:r,isControlKeyDown:e}}function vs(n,e){return n.some(({event:t,isControlKeyDown:r})=>t.ctrlKey&&!r)?"trackpad":n.some(({event:t})=>t.deltaMode!==NS)||n.some(GS)||n.every(({event:t})=>{const r=t.wheelDelta;return r!==void 0&&Math.abs(r)%40===0})?"mouse":n.some(({deltaX:t})=>t!==0)||n.length>1&&zS(n)?"trackpad":e?"mouse":"unknown"}function GS({event:n,deltaX:e,deltaY:t}){if(e!==0||t===0)return!1;const r=Math.abs(t/BS);if(Number.isInteger(r))return!0;const i=n.wheelDelta;return typeof i=="number"&&i!==0&&i%US===0}function zS(n){for(let e=0;e<n.length;e++){const t=n[e];if(Math.abs(t.deltaX)>xl||Math.abs(t.deltaY)>xl||e>0&&t.timeStamp-n[e-1].timeStamp>FS)return!1}return!0}const Sl=["mousedown","mousemove","mouseup","mouseover","mouseout","mouseenter","mouseleave"];class WS extends Ui{constructor(e,t,r){super(e,t,{enable:!0,...r}),this.handleEvent=s=>{this.handleOverEvent(s),this.handleOutEvent(s),this.handleEnterEvent(s),this.handleLeaveEvent(s),this.handleMoveEvent(s)},this.pressed=!1;const{enable:i=!1}=this.options;this.enableMoveEvent=i,this.enableLeaveEvent=i,this.enableEnterEvent=i,this.enableOutEvent=i,this.enableOverEvent=i,i&&Sl.forEach(s=>this.listen(s,!0))}destroy(){Sl.forEach(e=>this.listen(e,!1))}enableEventType(e,t){switch(e){case"pointermove":this.enableMoveEvent!==t&&(this.enableMoveEvent=t,this.listen("mousedown",t),this.listen("mousemove",t),this.listen("mouseup",t));break;case"pointerover":this.enableOverEvent!==t&&(this.enableOverEvent=t,this.listen("mouseover",t));break;case"pointerout":this.enableOutEvent!==t&&(this.enableOutEvent=t,this.listen("mouseout",t));break;case"pointerenter":this.enableEnterEvent!==t&&(this.enableEnterEvent=t,this.listen("mouseenter",t));break;case"pointerleave":this.enableLeaveEvent!==t&&(this.enableLeaveEvent=t,this.listen("mouseleave",t));break}}handleOverEvent(e){this.enableOverEvent&&e.type==="mouseover"&&this._emit("pointerover",e)}handleOutEvent(e){this.enableOutEvent&&e.type==="mouseout"&&this._emit("pointerout",e)}handleEnterEvent(e){this.enableEnterEvent&&e.type==="mouseenter"&&this._emit("pointerenter",e)}handleLeaveEvent(e){this.enableLeaveEvent&&e.type==="mouseleave"&&this._emit("pointerleave",e)}handleMoveEvent(e){if(this.enableMoveEvent)switch(e.type){case"mousedown":e.button>=0&&(this.pressed=!0);break;case"mousemove":e.buttons===0&&(this.pressed=!1),this.pressed||this._emit("pointermove",e);break;case"mouseup":this.pressed=!1;break}}_emit(e,t){this.callback({type:e,center:{x:t.clientX,y:t.clientY},srcEvent:t,pointerType:"mouse",target:t.target})}}const wl=["keydown","keyup"];class HS extends Ui{constructor(e,t,r){super(e,t,{enable:!0,tabIndex:0,...r}),this.handleEvent=s=>{const o=s.target||s.srcElement;o.tagName==="INPUT"&&o.type==="text"||o.tagName==="TEXTAREA"||(this.enableDownEvent&&s.type==="keydown"&&this.callback({type:"keydown",srcEvent:s,key:s.key,target:s.target}),this.enableUpEvent&&s.type==="keyup"&&this.callback({type:"keyup",srcEvent:s,key:s.key,target:s.target}))};const{enable:i=!1}=this.options;this.enableDownEvent=i,this.enableUpEvent=i,e.tabIndex=this.options.tabIndex,e.style.outline="none",i&&wl.forEach(s=>this.listen(s,!0))}destroy(){wl.forEach(e=>this.listen(e,!1))}enableEventType(e,t){e==="keydown"&&this.enableDownEvent!==t&&(this.enableDownEvent=t,this.listen(e,t)),e==="keyup"&&this.enableUpEvent!==t&&(this.enableUpEvent=t,this.listen(e,t))}}class jS extends Ui{constructor(e,t,r){r.enable=r.enable??!1,super(e,t,r),this.handleEvent=i=>{this.options.enable&&this.callback({type:"contextmenu",center:{x:i.clientX,y:i.clientY},srcEvent:i,pointerType:"mouse",target:i.target})},r.enable&&this.listen("contextmenu",!0)}destroy(){this.listen("contextmenu",!1)}enableEventType(e,t){e==="contextmenu"&&this.options.enable!==t&&(this.options.enable=t,this.listen("contextmenu",t))}}const Tl=1,No=2,El=4,XS={pointerdown:Tl,pointermove:No,pointerup:El,mousedown:Tl,mousemove:No,mouseup:El},KS=0,qS=1,YS=2,QS=1,ZS=2,JS=4;function ew(n){const e=XS[n.srcEvent.type];if(!e)return null;const{buttons:t,button:r}=n.srcEvent;let i=!1,s=!1,o=!1;return e===No?(i=!!(t&QS),s=!!(t&JS),o=!!(t&ZS)):(i=r===KS,s=r===qS,o=r===YS),{leftButton:i,middleButton:s,rightButton:o}}function tw(n,e){const t=n.center;if(!t)return null;const r=e.getBoundingClientRect(),i=r.width/e.offsetWidth||1,s=r.height/e.offsetHeight||1,o={x:(t.x-r.left-e.clientLeft)/i,y:(t.y-r.top-e.clientTop)/s};return{center:t,offsetCenter:o}}const nw={srcElement:"root",priority:0};class rw{constructor(e,t){this.handleEvent=r=>{if(this.isEmpty())return;const i=this._normalizeEvent(r);let s=r.srcEvent.target;for(;s&&s!==i.rootElement;){if(this._emit(i,s),i.handled)return;s=s.parentNode}this._emit(i,"root")},this.eventManager=e,this.recognizerName=t,this.handlers=[],this.handlersByElement=new Map,this._active=!1}isEmpty(){return!this._active}add(e,t,r,i=!1,s=!1){const{handlers:o,handlersByElement:a}=this,c={...nw,...r};let l=a.get(c.srcElement);l||(l=[],a.set(c.srcElement,l));const u={type:e,handler:t,srcElement:c.srcElement,priority:c.priority};i&&(u.once=!0),s&&(u.passive=!0),o.push(u),this._active=this._active||!u.passive;let d=l.length-1;for(;d>=0&&!(l[d].priority>=u.priority);)d--;l.splice(d+1,0,u)}remove(e,t){const{handlers:r,handlersByElement:i}=this;for(let s=r.length-1;s>=0;s--){const o=r[s];if(o.type===e&&o.handler===t){r.splice(s,1);const a=i.get(o.srcElement);a.splice(a.indexOf(o),1),a.length===0&&i.delete(o.srcElement)}}this._active=r.some(s=>!s.passive)}_emit(e,t){const r=this.handlersByElement.get(t);if(r){let i=!1;const s=()=>{e.handled=!0},o=()=>{e.handled=!0,i=!0},a=[];for(let c=0;c<r.length;c++){const{type:l,handler:u,once:d}=r[c];if(u({...e,type:l,stopPropagation:s,stopImmediatePropagation:o}),d&&a.push(r[c]),i)break}for(let c=0;c<a.length;c++){const{type:l,handler:u}=a[c];this.remove(l,u)}}}_normalizeEvent(e){const t=this.eventManager.getElement();return{...e,...ew(e),...tw(e,t),preventDefault:()=>{e.srcEvent.preventDefault()},stopImmediatePropagation:null,stopPropagation:null,handled:!1,rootElement:t}}}function iw(n){if("recognizer"in n)return n;let e;const t=Array.isArray(n)?[...n]:[n];if(typeof t[0]=="function"){const r=t.shift(),i=t.shift()||{};e=new r(i)}else e=t.shift();return{recognizer:e,recognizeWith:typeof t[0]=="string"?[t[0]]:t[0],requireFailure:typeof t[1]=="string"?[t[1]]:t[1]}}class fP{constructor(e=null,t={}){if(this._onBasicInput=r=>{this.manager.emit(r.srcEvent.type,r)},this._onOtherEvent=r=>{this.manager.emit(r.type,r)},this.options={recognizers:[],events:{},touchAction:"compute",tabIndex:0,cssProps:{},...t},this.events=new Map,this.element=e,this.wheelSession=new kS(e),!!e){this.manager=new yS(e,this.options);for(const r of this.options.recognizers){const{recognizer:i,recognizeWith:s,requireFailure:o}=iw(r);this.manager.add(i),s&&i.recognizeWith(s),o&&i.requireFailure(o)}this.manager.on("hammer.input",this._onBasicInput),this.wheelInput=new PS(e,this._onOtherEvent,{enable:!1,wheelSession:this.wheelSession}),this.moveInput=new WS(e,this._onOtherEvent,{enable:!1}),this.keyInput=new HS(e,this._onOtherEvent,{enable:!1,tabIndex:t.tabIndex}),this.contextmenuInput=new jS(e,this._onOtherEvent,{enable:!1}),this.on(this.options.events)}}getElement(){return this.element}destroy(){if(!this.element){this.wheelSession.destroy();return}this.wheelInput.destroy(),this.wheelSession.destroy(),this.moveInput.destroy(),this.keyInput.destroy(),this.contextmenuInput.destroy(),this.manager.destroy()}on(e,t,r){this._addEventHandler(e,t,r,!1)}once(e,t,r){this._addEventHandler(e,t,r,!0)}watch(e,t,r){this._addEventHandler(e,t,r,!1,!0)}off(e,t){this._removeEventHandler(e,t)}emit(e){var t;(t=this.manager)==null||t.emit(e.type,e)}_toggleRecognizer(e,t){var s,o,a,c;const{manager:r}=this;if(!r)return;const i=r.get(e);i&&(i.set({enable:t,wheelSession:this.wheelSession}),r.touchAction.update()),(s=this.wheelInput)==null||s.enableEventType(e,t),(o=this.moveInput)==null||o.enableEventType(e,t),(a=this.keyInput)==null||a.enableEventType(e,t),(c=this.contextmenuInput)==null||c.enableEventType(e,t)}_addEventHandler(e,t,r,i,s){if(typeof e!="string"){r=t;for(const[l,u]of Object.entries(e))this._addEventHandler(l,u,r,i,s);return}const{manager:o,events:a}=this;if(!o)return;let c=a.get(e);if(!c){const l=this._getRecognizerName(e)||e;c=new rw(this,l),a.set(e,c),o&&o.on(e,c.handleEvent)}c.add(e,t,r,i,s),c.isEmpty()||this._toggleRecognizer(c.recognizerName,!0)}_removeEventHandler(e,t){if(typeof e!="string"){for(const[s,o]of Object.entries(e))this._removeEventHandler(s,o);return}const{events:r}=this,i=r.get(e);if(i&&(i.remove(e,t),i.isEmpty())){const{recognizerName:s}=i;let o=!1;for(const a of r.values())if(a.recognizerName===s&&!a.isEmpty()){o=!0;break}o||this._toggleRecognizer(s,!1)}}_getRecognizerName(e){var t;return(t=this.manager.recognizers.find(r=>r.getEventNames().includes(e)))==null?void 0:t.options.event}}function sw(){return[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}function Ot(n,e){const t=pd([],e,n);return md(t,t,1/t[3]),t}function Oo(n,e,t){return n<e?e:n>t?t:n}function ow(n){return Math.log(n)*Math.LOG2E}const Ad=Math.log2||ow;function He(n,e){if(!n)throw new Error(e||"@math.gl/web-mercator: assertion failed.")}const Ae=Math.PI,Rd=Ae/4,Se=Ae/180,Fo=180/Ae,Wt=512,ii=4003e4,wr=85.051129,aw=1.5;function cw(n){return Ad(n)}function Uo(n){const[e,t]=n;He(Number.isFinite(e)),He(Number.isFinite(t)&&t>=-90&&t<=90,"invalid latitude");const r=e*Se,i=t*Se,s=Wt*(r+Ae)/(2*Ae),o=Wt*(Ae+Math.log(Math.tan(Rd+i*.5)))/(2*Ae);return[s,o]}function Da(n){const[e,t]=n,r=e/Wt*(2*Ae)-Ae,i=2*(Math.atan(Math.exp(t/Wt*(2*Ae)-Ae))-Rd);return[r*Fo,i*Fo]}function dP(n){const{latitude:e}=n;He(Number.isFinite(e));const t=Math.cos(e*Se);return cw(ii*t)-9}function hP(n){const e=Math.cos(n*Se);return Wt/ii/e}function lw(n){const{latitude:e,longitude:t,highPrecision:r=!1}=n;He(Number.isFinite(e)&&Number.isFinite(t));const i=Wt,s=Math.cos(e*Se),o=i/360,a=o/s,c=i/ii/s,l={unitsPerMeter:[c,c,c],metersPerUnit:[1/c,1/c,1/c],unitsPerDegree:[o,a,c],degreesPerUnit:[1/o,1/a,1/c]};if(r){const u=Se*Math.tan(e*Se)/s,d=o*u/2,h=i/ii*u,m=h/a*c;l.unitsPerDegree2=[0,d,h],l.unitsPerMeter2=[m,0,m]}return l}function mP(n,e){const[t,r,i]=n,[s,o,a]=e,{unitsPerMeter:c,unitsPerMeter2:l}=lw({longitude:t,latitude:r,highPrecision:!0}),u=Uo(n);u[0]+=s*(c[0]+l[0]*o),u[1]+=o*(c[1]+l[1]*o);const d=Da(u),h=(i||0)+(a||0);return Number.isFinite(i)||Number.isFinite(a)?[d[0],d[1],h]:d}function pP(n){const{height:e,pitch:t,bearing:r,altitude:i,scale:s,center:o}=n,a=sw();Io(a,a,[0,0,-i]),dd(a,a,-t*Se),hd(a,a,r*Se);const c=s/e;return fd(a,a,[c,c,c]),o&&Io(a,a,fv([],o)),a}function gP(n){const{width:e,height:t,altitude:r,pitch:i=0,offset:s,center:o,scale:a,nearZMultiplier:c=1,farZMultiplier:l=1}=n;let{fovy:u=Al(aw)}=n;r!==void 0&&(u=Al(r));const d=u*Se,h=i*Se,m=uw(u);let p=m;o&&(p+=o[2]*a/Math.cos(h)/t);const g=d*(.5+(s?s[1]:0)/t),b=Math.sin(g)*p/Math.sin(Oo(Math.PI/2-h-g,.01,Math.PI-.01)),_=Math.sin(h)*b+p,y=p*10,v=Math.min(_*l,y);return{fov:d,aspect:e/t,focalDistance:m,near:c,far:v}}function Al(n){return 2*Math.atan(.5/n)*Fo}function uw(n){return .5/Math.tan(.5*n*Se)}function bP(n,e){const[t,r,i=0]=n;return He(Number.isFinite(t)&&Number.isFinite(r)&&Number.isFinite(i)),Ot(e,[t,r,i,1])}function _P(n,e,t=0){const[r,i,s]=n;if(He(Number.isFinite(r)&&Number.isFinite(i),"invalid pixel coordinate"),Number.isFinite(s))return Ot(e,[r,i,s,1]);const o=Ot(e,[r,i,0,1]),a=Ot(e,[r,i,1,1]),c=o[2],l=a[2],u=c===l?0:((t||0)-c)/(l-c);return rd([],o,a,u)}function yP(n){const{width:e,height:t,bounds:r,minExtent:i=0,maxZoom:s=24,offset:o=[0,0]}=n,[[a,c],[l,u]]=r,d=fw(n.padding),h=Uo([a,Oo(u,-wr,wr)]),m=Uo([l,Oo(c,-wr,wr)]),p=[Math.max(Math.abs(m[0]-h[0]),i),Math.max(Math.abs(m[1]-h[1]),i)],g=[e-d.left-d.right-Math.abs(o[0])*2,t-d.top-d.bottom-Math.abs(o[1])*2];He(g[0]>0&&g[1]>0);const b=g[0]/p[0],_=g[1]/p[1],y=(d.right-d.left)/2/b,v=(d.top-d.bottom)/2/_,w=[(m[0]+h[0])/2+y,(m[1]+h[1])/2+v],x=Da(w),T=Math.min(s,Ad(Math.abs(Math.min(b,_))));return He(Number.isFinite(T)),{longitude:x[0],latitude:x[1],zoom:T}}function fw(n=0){return typeof n=="number"?{top:n,bottom:n,left:n,right:n}:(He(Number.isFinite(n.top)&&Number.isFinite(n.bottom)&&Number.isFinite(n.left)&&Number.isFinite(n.right)),n)}const Rl=Math.PI/180;function vP(n,e=0){const{width:t,height:r,unproject:i}=n,s={targetZ:e},o=i([0,r],s),a=i([t,r],s);let c,l;const u=n.fovy?.5*n.fovy*Rl:Math.atan(.5/n.altitude),d=(90-n.pitch)*Rl;return u>d-.01?(c=Il(n,0,e),l=Il(n,t,e)):(c=i([0,0],s),l=i([t,0],s)),[o,a,l,c]}function Il(n,e,t){const{pixelUnprojectionMatrix:r}=n,i=Ot(r,[e,0,1,1]),s=Ot(r,[e,n.height,1,1]),a=(t*n.distanceScales.unitsPerMeter[2]-i[2])/(s[2]-i[2]),c=rd([],i,s,a),l=Da(c);return l.push(t),l}class dw{constructor(e={}){f(this,"name");f(this,"playing",!0);f(this,"speed",1);f(this,"startTime",0);this.name=e.name||"unnamed",Object.assign(this,e)}setTime(e){if(!this.playing)return;const r=(e/1e3-this.startTime)*this.speed;this.applyTime(r)}}class hw{constructor(e){f(this,"clips");f(this,"animations");this.clips=e,this.animations=e}animate(e){S.warn(`${this.constructor.name}#animate is deprecated. Use ${this.constructor.name}#setTime instead`)(),this.setTime(e)}setTime(e){this.clips.forEach(t=>t.setTime(e))}getAnimations(){return this.clips}}function mw(n,e,t="vector"){const{input:r,output:i,interpolation:s="LINEAR"}=e;if(!r.length||!i.length||!Number.isFinite(n))return null;const o=r.length-1;if(n<=r[0]||o===0)return xs(i,s,0,t);if(n>=r[o])return xs(i,s,o,t);let a=0,c=o;for(;c-a>1;){const m=Math.floor((a+c)/2);r[m]<=n?a=m:c=m}const l=r[a],d=r[c]-l;if(d<=0||s==="STEP")return xs(i,s,a,t);const h=(n-l)/d;switch(s){case"LINEAR":{const m=i[a],p=i[c];return!m||!p?null:t==="quaternion"?Do(m,p,h):pw(m,p,h)}case"CUBICSPLINE":{const m=i[a*3+1],p=i[a*3+2],g=i[c*3],b=i[c*3+1];if(!m||!p||!g||!b)return null;const _=gw(m,p,g,b,d,h);return t==="quaternion"?Lt(_):_}default:return null}}function Do(n,e,t){const r=Lt(n),i=Lt(e);let s=r.reduce((d,h,m)=>d+h*i[m],0);const o=s<0?-1:1;if(s=Math.min(Math.abs(s),1),s>.9995)return Lt(r.map((d,h)=>d+t*(i[h]*o-d)));const a=Math.acos(s),c=Math.sin(a),l=Math.sin((1-t)*a)/c,u=Math.sin(t*a)/c*o;return Lt(r.map((d,h)=>d*l+i[h]*u))}function xs(n,e,t,r){const i=n[e==="CUBICSPLINE"?t*3+1:t];return i?r==="quaternion"?Lt(i):[...i]:null}function pw(n,e,t){return n.map((r,i)=>(1-t)*r+t*e[i])}function gw(n,e,t,r,i,s){const o=s*s,a=o*s;return n.map((c,l)=>(2*a-3*o+1)*c+(a-2*o+s)*e[l]*i+(-2*a+3*o)*r[l]+(a-o)*t[l]*i)}function Lt(n){const e=Math.hypot(...n);return e>0?n.map(t=>t/e):[0,0,0,1]}class Ss{constructor(e){f(this,"name");f(this,"times");f(this,"values");f(this,"interpolation");f(this,"valueType");f(this,"binding");this.name=e.name||e.binding.id||"unnamed",this.times=e.times,this.values=e.values,this.interpolation=e.interpolation||"LINEAR",this.valueType=e.valueType||"vector",this.binding=e.binding}get duration(){return this.times[this.times.length-1]||0}get sampler(){return{input:this.times,output:this.values,interpolation:this.interpolation}}evaluate(e){return mw(e,this.sampler,this.valueType)}}class bw{constructor(e){f(this,"name");f(this,"tracks");f(this,"duration");this.name=e.name||"unnamed",this.tracks=e.tracks,this.duration=e.duration??Math.max(0,...e.tracks.map(t=>t.duration))}}class _w{constructor(e,t,r={}){f(this,"clip");f(this,"mixer");f(this,"time",0);f(this,"timeScale");f(this,"weight");f(this,"loop");f(this,"repetitions");f(this,"paused",!1);f(this,"playing",!1);f(this,"elapsedTime",0);f(this,"fade",null);this.mixer=e,this.clip=t,this.loop=r.loop||"repeat",this.repetitions=r.repetitions??Number.POSITIVE_INFINITY,this.timeScale=r.timeScale??1,this.weight=r.weight??1}play(){return this.playing=!0,this.paused=!1,this}pause(){return this.paused=!0,this}resume(){return this.playing=!0,this.paused=!1,this}stop(){return this.playing=!1,this.paused=!1,this.fade=null,this.reset()}reset(){return this.elapsedTime=0,this.time=0,this}setTime(e){return this.elapsedTime=e,this.time=this.resolveLocalTime(e),this}setLoop(e,t=Number.POSITIVE_INFINITY){return this.loop=e,this.repetitions=t,this.time=this.resolveLocalTime(this.elapsedTime),this}setEffectiveWeight(e){return this.weight=Math.max(0,e),this.fade=null,this}setEffectiveTimeScale(e){return this.timeScale=e,this}fadeIn(e){return this.scheduleFade(1,e)}fadeOut(e){return this.scheduleFade(0,e)}crossFadeTo(e,t){return e.weight=0,e.play().fadeIn(t),this.fadeOut(t)}crossFadeFrom(e,t){return e.crossFadeTo(this,t),this}advance(e){!this.playing||this.paused||(this.advanceFade(Math.abs(e)),this.elapsedTime+=e*this.timeScale,this.time=this.resolveLocalTime(this.elapsedTime),this.hasFinished()&&(this.playing=!1))}get shouldApply(){return(this.playing||this.hasFinished())&&this.weight>0}scheduleFade(e,t){return t<=0?(this.weight=e,this.fade=null,this):(this.fade={duration:t,elapsedTime:0,startWeight:this.weight,endWeight:e},this)}advanceFade(e){if(!this.fade)return;this.fade.elapsedTime+=e;const t=Math.min(this.fade.elapsedTime/this.fade.duration,1);this.weight=this.fade.startWeight+(this.fade.endWeight-this.fade.startWeight)*t,t===1&&(this.fade=null)}hasFinished(){const e=this.clip.duration;return e<=0?this.loop==="once":this.loop==="once"?this.elapsedTime>=e||this.elapsedTime<0:Number.isFinite(this.repetitions)&&Math.abs(this.elapsedTime)>=e*this.repetitions}resolveLocalTime(e){const t=this.clip.duration;if(t<=0)return 0;if(this.loop==="once")return Math.min(Math.max(e,0),t);if(Number.isFinite(this.repetitions)&&Math.abs(e)>=t*this.repetitions)return this.loop==="ping-pong"&&this.repetitions%2===0||e<0?0:t;const r=e>=0&&e<t?e:(e%t+t)%t;if(this.loop==="repeat")return r;const i=Math.floor(e/t);return Math.abs(i%2)===0?r:t-r}}class Id{constructor(e=[]){f(this,"time",0);f(this,"timeScale",1);f(this,"clips",new Map);f(this,"actions",new Map);f(this,"initialValues",new Map);e.forEach(t=>this.addClip(t))}addClip(e){return this.clips.set(e.name,e),this}clipAction(e,t){const r=typeof e=="string"?this.clips.get(e):e;if(!r)throw new Error(`Unknown animation clip: ${e}`);this.addClip(r);let i=this.actions.get(r);return i||(i=new _w(this,r,t),this.actions.set(r,i)),i}getAction(e){const t=this.clips.get(e);return t?this.actions.get(t):void 0}update(e){return this.advance(e),this.applyValues(),this}advance(e){const t=e*this.timeScale;return this.time+=t,this.actions.forEach(r=>r.advance(t)),this}setTime(e){return this.time=e,this.actions.forEach(t=>{t.paused||t.setTime(e*t.timeScale)}),this.applyValues(),this}stopAllAction(){return this.actions.forEach(e=>e.stop()),this}applyValues(){const e=new Map;this.actions.forEach(t=>{!t.shouldApply&&!(t.playing&&t.weight===0)||t.clip.tracks.forEach(r=>{var l,u;const i=r.evaluate(t.time);if(!i)return;const s=r.binding.id||r.binding;if(!this.initialValues.has(s)){const d=(u=(l=r.binding).getValue)==null?void 0:u.call(l);d&&this.initialValues.set(s,[...d])}if(t.weight===0&&!this.initialValues.has(s))return;const o=e.get(s);if(!o){e.set(s,{binding:r.binding,value:[...i],valueType:r.valueType,weight:t.weight});return}if(t.weight===0)return;const a=o.weight+t.weight,c=t.weight/a;o.value=r.valueType==="quaternion"?Do(o.value,i,c):o.value.map((d,h)=>d+(i[h]-d)*c),o.weight=a})}),e.forEach(({binding:t,value:r,valueType:i,weight:s},o)=>{const a=s<1?this.initialValues.get(o):void 0;a&&a.length===r.length&&(r=i==="quaternion"?Do(a,r,s):r.map((c,l)=>a[l]+(c-a[l])*s)),t.setValue(r)})}}const ws={};function tt(n="id"){ws[n]=ws[n]||1;const e=ws[n]++;return`${n}-${e}`}class ka{constructor(e){f(this,"id");f(this,"topology");f(this,"vertexCount");f(this,"indices");f(this,"attributes");f(this,"bufferLayout");f(this,"userData",{});const{attributes:t={},indices:r=null,vertexCount:i=null}=e;this.id=e.id||tt("geometry"),this.topology=e.topology,r&&(this.indices=ArrayBuffer.isView(r)?{value:r,size:1}:r),this.attributes={};for(const[s,o]of Object.entries(t)){const a=ArrayBuffer.isView(o)?{value:o}:o;if(!ArrayBuffer.isView(a.value))throw new Error(`${this._print(s)}: must be typed array or object with value as typed array`);if((s==="POSITION"||s==="positions")&&!a.size&&(a.size=3),s==="indices"){if(this.indices)throw new Error("Multiple indices detected");this.indices=a}else{const c=$n(s),l=Object.keys(this.attributes).find(u=>$n(u)===c);l&&delete this.attributes[l],this.attributes[s]=a}}this.indices&&this.indices.isIndexed!==void 0&&(this.indices=Object.assign({},this.indices),delete this.indices.isIndexed),this.vertexCount=i||this._calculateVertexCount(this.attributes,this.indices),this.bufferLayout=e.bufferLayout||yw(this.attributes)}getVertexCount(){return this.vertexCount}getAttributes(){return this.indices?{indices:this.indices,...this.attributes}:this.attributes}_print(e){return`Geometry ${this.id} attribute ${e}`}_setAttributes(e,t){return this}_calculateVertexCount(e,t){if(t)return t.value.length;let r=1/0;for(const i of Object.values(e)){if(!i)continue;const{value:s,size:o,constant:a}=i;!a&&s&&o!==void 0&&o>=1&&(r=Math.min(r,s.length/o))}return r}}function $n(n){switch(n){case"POSITION":return"positions";case"NORMAL":return"normals";case"TEXCOORD_0":return"texCoords";case"TEXCOORD_1":return"texCoords1";case"COLOR_0":return"colors";default:return n}}function yw(n){const e=[];for(const[t,r]of Object.entries(n)){if(!r)continue;const{value:i,size:s,normalized:o}=r;if(s===void 0)throw new Error(`Attribute ${t} is missing a size`);e.push({name:$n(t),format:ae.getVertexFormatFromAttribute(i,s,o)})}return e}function Md(n,e={}){const t=e.bufferName||"geometry";if(vw(n,t))return n;const r=e.minAttributeAlignment||4,i=xw(n,e.attributes),s=[];let o=0,a=1/0;for(const[u,d]of i){if(!d)continue;if(d.constant)throw new Error(`Attribute ${u} is constant`);const{value:h,size:m,normalized:p}=d;if(!ArrayBuffer.isView(h))throw new Error(`Attribute ${u} is missing typed array data`);if(m===void 0)throw new Error(`Attribute ${u} is missing a size`);const g=ae.getVertexFormatFromAttribute(h,m,p),b=ae.getVertexFormatInfo(g);o=Ml(o,r),s.push({sourceName:u,attributeName:$n(u),value:h,size:m,format:g,byteOffset:o,byteLength:b.byteLength}),o+=b.byteLength;const _=h.length/m;if(!Number.isInteger(_))throw new Error(`Attribute ${u} length is not divisible by size`);a=Math.min(a,_)}if(s.length===0||!Number.isFinite(a))throw new Error(`Geometry ${n.id} has no interleavable attributes`);const c=Ml(o,r),l=new ArrayBuffer(a*c);for(const u of s)Sw(l,a,c,u);return new ka({id:n.id,topology:n.topology||"triangle-list",vertexCount:n.vertexCount,indices:n.indices,attributes:{[t]:{value:new Uint8Array(l),size:c,byteStride:c}},bufferLayout:[{name:t,stepMode:"vertex",byteStride:c,attributes:s.map(u=>({attribute:u.attributeName,format:u.format,byteOffset:u.byteOffset}))}]})}function vw(n,e){var r;if(n.bufferLayout.length!==1)return!1;const t=n.bufferLayout[0];return t.name===e&&!!((r=t.attributes)!=null&&r.length)&&!!n.attributes[e]}function xw(n,e){return e?e.map(t=>[t,n.attributes[t]]):Object.entries(n.attributes)}function Sw(n,e,t,r){const i=r.value.constructor,s=i.BYTES_PER_ELEMENT;if(r.byteOffset%s!==0||t%s!==0)throw new Error(`Attribute ${r.sourceName} is not aligned to its component type`);const o=new i(n),a=r.value,c=r.byteOffset/s,l=t/s;for(let u=0;u<e;u++){const d=u*r.size,h=u*l+c;for(let m=0;m<r.size;m++)o[h+m]=a[d+m]}}function Ml(n,e){return Math.ceil(n/e)*e}function $a(n){const e=n.value;if(e instanceof Float32Array)return e;const t=new Float32Array(e.length),r=Ld(e),i=e instanceof Int8Array||e instanceof Int16Array||e instanceof Int32Array;for(let s=0;s<e.length;s++){const o=Number(e[s]);t[s]=n.normalized&&r?i?Math.max(o/r,-1):o/r:o}return t}function ww(n,e,t){const r={};for(const i of["POSITION","NORMAL","TANGENT"]){const s=n[i];if(!s)continue;const o=new Float32Array(s),a=i==="TANGENT"?4:3,c=Math.floor(s.length/a);for(let l=0;l<Math.min(e.length,t.length);l++){const u=t[l],d=e[l][i];if(!u||!d)continue;const h=i==="TANGENT"&&d.length===c*4?4:3;for(let m=0;m<c;m++){const p=m*a,g=m*h;for(let b=0;b<3;b++)o[p+b]+=(d[g+b]||0)*u}}i!=="POSITION"&&Aw(o,a),r[i]=o}return r}function Tw(n,e,t,r){var d,h,m;const i={};for(const p of["POSITION","NORMAL","TANGENT"]){const g=e.attributes[p];g&&(i[p]=$a(g))}const s=ww(i,t,r),o={};for(const[p,g]of Object.entries(e.attributes))g&&(o[p]=g);for(const p of["POSITION","NORMAL","TANGENT"]){const g=s[p],b=o[p];g&&b&&(o[p]={...b,value:Ew(b,g)})}const a=new ka({id:e.id,topology:e.topology||"triangle-list",vertexCount:e.vertexCount,indices:e.indices,attributes:o,bufferLayout:e.bufferLayout}),l=(d=Md(a).attributes.geometry)==null?void 0:d.value,u=((h=n._gpuGeometry)==null?void 0:h.attributes.geometry)||n.bufferAttributes.geometry;if(l&&u){u.write(l);return}for(const p of["POSITION","NORMAL","TANGENT"]){const g=s[p];if(g){const b=p==="POSITION"?"positions":p==="NORMAL"?"normals":"TANGENT";(m=n.bufferAttributes[b])==null||m.write(g)}}}function Ew(n,e){if(n.value instanceof Float32Array)return e;const t=n.value.slice(),r=Ld(t),i=t instanceof Int8Array||t instanceof Int16Array||t instanceof Int32Array;for(let s=0;s<e.length;s++){const o=e[s];t[s]=n.normalized&&r?Math.round(Math.max(i?-1:0,Math.min(1,o))*r):o}return t}function Ld(n){return n instanceof Int8Array?127:n instanceof Uint8Array||n instanceof Uint8ClampedArray?255:n instanceof Int16Array?32767:n instanceof Uint16Array?65535:n instanceof Int32Array?2147483647:n instanceof Uint32Array?4294967295:0}function Aw(n,e){for(let t=0;t<n.length;t+=e){const r=Math.hypot(n[t],n[t+1],n[t+2]);r>0&&(n[t]/=r,n[t+1]/=r,n[t+2]/=r)}}function Rw(n){const{joints:e,meshNode:t,worldMatrices:r,inverseBindMatrices:i,target:s}=n,o=e.length,a=s&&s.length===o*16?s:new Float32Array(o*16),c=t?r.get(t)||t.matrix:void 0,l=c?new $(c).invert():null;for(let u=0;u<o;u++){const d=e[u],h=r.get(d)||d.matrix,m=l?new $(l).multiplyRight(h):new $(h),p=u*16;if(i&&i.length>=p+16){const g=new $;for(let b=0;b<16;b++)g[b]=i[p+b];m.multiplyRight(g)}a.set(m,p)}return a}let Iw=1,Mw=1;class xP{constructor(){f(this,"time",0);f(this,"channels",new Map);f(this,"animations",new Map);f(this,"playing",!1);f(this,"lastEngineTime",-1)}addChannel(e){const{delay:t=0,duration:r=Number.POSITIVE_INFINITY,rate:i=1,repeat:s=1}=e,o=Iw++,a={time:0,delay:t,duration:r,rate:i,repeat:s};return this._setChannelTime(a,this.time),this.channels.set(o,a),o}removeChannel(e){this.channels.delete(e);for(const[t,r]of this.animations)r.channel===e&&this.detachAnimation(t)}isFinished(e){const t=this.channels.get(e);return t===void 0?!1:this.time>=t.delay+t.duration*t.repeat}getTime(e){if(e===void 0)return this.time;const t=this.channels.get(e);return t===void 0?-1:t.time}setTime(e){this.time=Math.max(0,e);const t=this.channels.values();for(const i of t)this._setChannelTime(i,this.time);const r=this.animations.values();for(const i of r){const{animation:s,channel:o}=i;s.setTime(this.getTime(o))}}play(){this.playing=!0}pause(){this.playing=!1,this.lastEngineTime=-1}reset(){this.setTime(0)}attachAnimation(e,t){const r=Mw++;return this.animations.set(r,{animation:e,channel:t}),e.setTime(this.getTime(t)),r}detachAnimation(e){this.animations.delete(e)}update(e){this.playing&&(this.lastEngineTime===-1&&(this.lastEngineTime=e),this.setTime(this.time+(e-this.lastEngineTime)),this.lastEngineTime=e)}_setChannelTime(e,t){const r=t-e.delay,i=e.duration*e.repeat;r>=i?e.time=e.duration*e.rate:(e.time=Math.max(0,r)%e.duration,e.time*=e.rate)}}function Lw(n){const e=typeof window<"u"?window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame:null;return e?e.call(window,n):setTimeout(()=>n(typeof performance<"u"?performance.now():Date.now()),1e3/60)}function Cw(n){const e=typeof window<"u"?window.cancelAnimationFrame||window.webkitCancelAnimationFrame||window.mozCancelAnimationFrame:null;if(e){e.call(window,n);return}clearTimeout(n)}let Pw=0;const Bw="Animation Loop",Ll={requestAnimationFrame:n=>Lw(n),cancelAnimationFrame:n=>Cw(n)},Ln=class Ln{constructor(e){f(this,"device",null);f(this,"canvas",null);f(this,"props");f(this,"animationProps",null);f(this,"timeline",null);f(this,"stats");f(this,"sharedStats");f(this,"cpuTime");f(this,"gpuTime");f(this,"frameRate");f(this,"display");f(this,"_needsRedraw","initialized");f(this,"_initialized",!1);f(this,"_running",!1);f(this,"_animationFrameId",null);f(this,"_nextFramePromise",null);f(this,"_resolveNextFrame",null);f(this,"_cpuStartTime",0);f(this,"_error",null);f(this,"_lastFrameTime",0);if(this.props={...Ln.defaultAnimationLoopProps,...e},e=this.props,!e.device)throw new Error("No device provided");this.stats=e.stats||new ku({id:`animation-loop-${Pw++}`}),this.sharedStats=Eb.stats.get(Bw),this.frameRate=this.stats.get("Frame Rate"),this.frameRate.setSampleSize(1),this.cpuTime=this.stats.get("CPU Time"),this.gpuTime=this.stats.get("GPU Time"),this.setProps({autoResizeViewport:e.autoResizeViewport,animationFrameProvider:e.animationFrameProvider}),this.start=this.start.bind(this),this.stop=this.stop.bind(this),this._onMousemove=this._onMousemove.bind(this),this._onMouseleave=this._onMouseleave.bind(this)}destroy(){var e;this.stop(),this._setDisplay(null),(e=this.device)==null||e._disableDebugGPUTime()}delete(){this.destroy()}reportError(e){this._error=e,this.props.onError(e),this.props.onError===Ln.defaultAnimationLoopProps.onError&&typeof window<"u"&&typeof ErrorEvent<"u"&&window.dispatchEvent(new ErrorEvent("error",{error:e,message:e.message}))}setNeedsRedraw(e){return this._needsRedraw=this._needsRedraw||e,this}needsRedraw(){const e=this._needsRedraw;return this._needsRedraw=!1,e}setProps(e){if("autoResizeViewport"in e&&(this.props.autoResizeViewport=e.autoResizeViewport||!1),"animationFrameProvider"in e){const t=e.animationFrameProvider||Ll;if(t!==this.props.animationFrameProvider){const r=this._animationFrameId!==null;r&&this._cancelAnimationFrame(),this.props.animationFrameProvider=t,r&&this._requestAnimationFrame()}}return this}async start(){if(this._running)return this;this._running=!0;try{let e;if(!this._initialized){if(this._initialized=!0,await this._initDevice(),this._initialize(),!this._running)return null;await this.props.onInitialize(this._getAnimationProps())}return this._running?(e!==!1&&(this._cancelAnimationFrame(),this._requestAnimationFrame()),this):null}catch(e){const t=e instanceof Error?e:new Error("Unknown error");throw this.props.onError(t),t}}stop(){if(this._running){const e=this.animationProps;this._cancelAnimationFrame(),this._nextFramePromise=null,this._resolveNextFrame=null,this._running=!1,this._lastFrameTime=0,e&&this.props.onFinalize(e)}return this}redraw(e,t=null){var r;return(r=this.device)!=null&&r.isLost||this._error?this:(this._beginFrameTimers(e),this._setupFrame(),this.animationProps&&(this.animationProps.animationFrame=t),this._updateAnimationProps(),this._renderFrame(this._getAnimationProps()),this._clearNeedsRedraw(),this._resolveNextFrame&&(this._resolveNextFrame(this),this._nextFramePromise=null,this._resolveNextFrame=null),this._endFrameTimers(),this)}attachTimeline(e){return this.timeline=e,this.timeline}detachTimeline(){this.timeline=null}waitForRender(){return this.setNeedsRedraw("waitForRender"),this._nextFramePromise||(this._nextFramePromise=new Promise(e=>{this._resolveNextFrame=e})),this._nextFramePromise}async toDataURL(){if(this.setNeedsRedraw("toDataURL"),await this.waitForRender(),this.canvas instanceof HTMLCanvasElement)return this.canvas.toDataURL();throw new Error("OffscreenCanvas")}_initialize(){var e;this._startEventHandling(),this._initializeAnimationProps(),this._updateAnimationProps(),this._resizeViewport(),(e=this.device)==null||e._enableDebugGPUTime()}_setDisplay(e){this.display&&(this.display.destroy(),this.display.animationLoop=null),e&&(e.animationLoop=this),this.display=e}_requestAnimationFrame(){this._running&&(this._animationFrameId=this.props.animationFrameProvider.requestAnimationFrame(this._animationFrame.bind(this)))}_cancelAnimationFrame(){this._animationFrameId!==null&&(this.props.animationFrameProvider.cancelAnimationFrame(this._animationFrameId),this._animationFrameId=null)}_animationFrame(e,t){if(this._running)try{this.redraw(e,t??null),this._requestAnimationFrame()}catch(r){const i=r instanceof Error?r:new Error(String(r));this.reportError(i),this.stop()}}_renderFrame(e){if(this.display){this.display._renderFrame(e);return}const t=this.props.onRender(this._getAnimationProps());this.device&&t!==!1&&this.device.submit()}_clearNeedsRedraw(){this._needsRedraw=!1}_setupFrame(){this._resizeViewport()}_initializeAnimationProps(){var i;const e=(i=this.device)==null?void 0:i.getDefaultCanvasContext();if(!this.device||!e)throw new Error("loop");const t=e==null?void 0:e.canvas,r=e.props.useDevicePixels;this.animationProps={animationLoop:this,device:this.device,canvasContext:e,canvas:t,useDevicePixels:r,timeline:this.timeline,needsRedraw:!1,width:1,height:1,aspect:1,time:0,startTime:Date.now(),engineTime:0,tick:0,tock:0,animationFrame:null,_mousePosition:null}}_getAnimationProps(){if(!this.animationProps)throw new Error("animationProps");return this.animationProps}_updateAnimationProps(){if(!this.animationProps)return;const{width:e,height:t,aspect:r}=this._getSizeAndAspect();(e!==this.animationProps.width||t!==this.animationProps.height)&&this.setNeedsRedraw("drawing buffer resized"),r!==this.animationProps.aspect&&this.setNeedsRedraw("drawing buffer aspect changed"),this.animationProps.width=e,this.animationProps.height=t,this.animationProps.aspect=r,this.animationProps.needsRedraw=this._needsRedraw,this.animationProps.engineTime=Date.now()-this.animationProps.startTime,this.timeline&&this.timeline.update(this.animationProps.engineTime),this.animationProps.tick=Math.floor(this.animationProps.time/1e3*60),this.animationProps.tock++,this.animationProps.time=this.timeline?this.timeline.getTime():this.animationProps.engineTime}async _initDevice(){if(this.device=await this.props.device,!this.device)throw new Error("No device provided");this.canvas=this.device.getDefaultCanvasContext().canvas||null}_createInfoDiv(){if(this.canvas&&this.props.onAddHTML){const e=document.createElement("div");document.body.appendChild(e),e.style.position="relative";const t=document.createElement("div");t.style.position="absolute",t.style.left="10px",t.style.bottom="10px",t.style.width="300px",t.style.background="white",this.canvas instanceof HTMLCanvasElement&&e.appendChild(this.canvas),e.appendChild(t);const r=this.props.onAddHTML(t);r&&(t.innerHTML=r)}}_getSizeAndAspect(){if(!this.device)return{width:1,height:1,aspect:1};const[e,t]=this.device.getDefaultCanvasContext().getDrawingBufferSize(),r=e>0&&t>0?e/t:1;return{width:e,height:t,aspect:r}}_resizeViewport(){this.props.autoResizeViewport&&this.device.gl&&this.device.gl.viewport(0,0,this.device.gl.drawingBufferWidth,this.device.gl.drawingBufferHeight)}_beginFrameTimers(e){var r;const t=e??(typeof performance<"u"?performance.now():Date.now());if(this._lastFrameTime){const i=t-this._lastFrameTime;i>0&&this.frameRate.addTime(i)}this._lastFrameTime=t,(r=this.device)!=null&&r._isDebugGPUTimeEnabled()&&this._consumeEncodedGpuTime(),this.cpuTime.timeStart()}_endFrameTimers(){var e;(e=this.device)!=null&&e._isDebugGPUTimeEnabled()&&this._consumeEncodedGpuTime(),this.cpuTime.timeEnd(),this._updateSharedStats()}_consumeEncodedGpuTime(){if(!this.device)return;const e=this.device.commandEncoder._gpuTimeMs;e!==void 0&&(this.gpuTime.addTime(e),this.device.commandEncoder._gpuTimeMs=void 0)}_updateSharedStats(){if(this.stats!==this.sharedStats){for(const e of Object.keys(this.sharedStats.stats))this.stats.stats[e]||delete this.sharedStats.stats[e];this.stats.forEach(e=>{const t=this.sharedStats.get(e.name,e.type);t.sampleSize=e.sampleSize,t.time=e.time,t.count=e.count,t.samples=e.samples,t.lastTiming=e.lastTiming,t.lastSampleTime=e.lastSampleTime,t.lastSampleCount=e.lastSampleCount,t._count=e._count,t._time=e._time,t._samples=e._samples,t._startTime=e._startTime,t._timerPending=e._timerPending})}}_startEventHandling(){this.canvas&&(this.canvas.addEventListener("mousemove",this._onMousemove.bind(this)),this.canvas.addEventListener("mouseleave",this._onMouseleave.bind(this)))}_onMousemove(e){e instanceof MouseEvent&&(this._getAnimationProps()._mousePosition=[e.offsetX,e.offsetY])}_onMouseleave(e){this._getAnimationProps()._mousePosition=null}};f(Ln,"defaultAnimationLoopProps",{device:null,onAddHTML:()=>"",onInitialize:async()=>null,onRender:()=>{},onFinalize:()=>{},onError:e=>{console.error(e)},stats:void 0,autoResizeViewport:!1,animationFrameProvider:Ll});let Cl=Ln;class Pl{constructor(e){f(this,"id");f(this,"userData",{});f(this,"topology");f(this,"bufferLayout",[]);f(this,"vertexCount");f(this,"indices");f(this,"attributes");if(this.id=e.id||tt("geometry"),this.topology=e.topology,this.indices=e.indices||null,this.attributes=e.attributes,this.vertexCount=e.vertexCount,this.bufferLayout=e.bufferLayout||[],this.indices&&!(this.indices.usage&F.INDEX))throw new Error("Index buffer must have INDEX usage")}destroy(){var e;(e=this.indices)==null||e.destroy();for(const t of Object.values(this.attributes))t.destroy()}getVertexCount(){return this.vertexCount}getAttributes(){return this.attributes}getIndexes(){return this.indices||null}_calculateVertexCount(e){return e.byteLength/12}}function Nw(n,e){if(e instanceof Pl)return e;const t=Md(e),r=Ow(n,t),{attributes:i,bufferLayout:s}=Fw(n,t);return new Pl({topology:t.topology||"triangle-list",bufferLayout:s,vertexCount:t.vertexCount,indices:r,attributes:i})}function Ow(n,e){if(!e.indices)return;const t=e.indices.value;return n.createBuffer({usage:F.INDEX,data:t})}function Fw(n,e){var r;const t={};for(const[i,s]of Object.entries(e.attributes)){const o=((r=e.bufferLayout.find(a=>a.name===i))==null?void 0:r.name)||$n(i);s&&(t[o]=n.createBuffer({data:s.value,id:`${i}-buffer`}))}return{attributes:t,bufferLayout:e.bufferLayout,vertexCount:e.vertexCount}}function Uw(n,e){var i;const t={},r="Values";if(n.attributes.length===0&&!((i=n.varyings)!=null&&i.length))return{"No attributes or varyings":{[r]:"N/A"}};for(const s of n.attributes)if(s){const o=`${s.location} ${s.name}: ${s.type}`;t[`in ${o}`]={[r]:s.stepMode||"vertex"}}for(const s of n.varyings||[]){const o=`${s.location} ${s.name}`;t[`out ${o}`]={[r]:JSON.stringify(s)}}return t}const Tr="__debugFramebufferState",Ts=8;function Dw(n,e,t){if(n.device.type!=="webgl")return;const r=Vw(n.device);if(!r.flushing){if(zw(n)){kw(n,t,r);return}e&&Gw(e)&&e.handle!==null&&(r.queuedFramebuffers.includes(e)||r.queuedFramebuffers.push(e))}}function kw(n,e,t){if(t.queuedFramebuffers.length===0)return;const r=n.device,{gl:i}=r,s=i.getParameter(36010),o=i.getParameter(36006),[a,c]=n.device.getDefaultCanvasContext().getDrawingBufferSize();let l=Bl(e.top,Ts);const u=Bl(e.left,Ts);t.flushing=!0;try{for(const d of t.queuedFramebuffers){const[h,m,p,g,b]=$w({framebuffer:d,targetWidth:a,targetHeight:c,topPx:l,leftPx:u,minimap:e.minimap});i.bindFramebuffer(36008,d.handle),i.bindFramebuffer(36009,null),i.blitFramebuffer(0,0,d.width,d.height,h,m,p,g,16384,9728),l+=b+Ts}}finally{i.bindFramebuffer(36008,s),i.bindFramebuffer(36009,o),t.flushing=!1}}function $w(n){const{framebuffer:e,targetWidth:t,targetHeight:r,topPx:i,leftPx:s}=n,o=Math.max(Math.floor(t/4),1),a=Math.max(Math.floor(r/4),1),c=Math.min(o/e.width,a/e.height),l=Math.max(Math.floor(e.width*c),1),u=Math.max(Math.floor(e.height*c),1),d=s,h=Math.max(r-i-u,0),m=d+l,p=h+u;return[d,h,m,p,u]}function Vw(n){var e;return(e=n.userData)[Tr]||(e[Tr]={flushing:!1,queuedFramebuffers:[]}),n.userData[Tr]}function Gw(n){return"colorAttachments"in n}function zw(n){const e=n.props.framebuffer;return!e||e.handle===null}function Bl(n,e){if(!n)return e;const t=Number.parseInt(n,10);return Number.isFinite(t)?t:e}function xn(n,e,t){if(n===e)return!0;if(!t||!n||!e)return!1;if(Array.isArray(n)){if(!Array.isArray(e)||n.length!==e.length)return!1;for(let r=0;r<n.length;r++)if(!xn(n[r],e[r],t-1))return!1;return!0}if(Array.isArray(e))return!1;if(typeof n=="object"&&typeof e=="object"){const r=Object.keys(n),i=Object.keys(e);if(r.length!==i.length)return!1;for(const s of r)if(!e.hasOwnProperty(s)||!xn(n[s],e[s],t-1))return!1;return!0}return!1}class Es{constructor(e){f(this,"bufferLayouts");this.bufferLayouts=e}getBufferLayout(e){return this.bufferLayouts.find(t=>t.name===e)||null}getAttributeNamesForBuffer(e){return To(e)}mergeBufferLayouts(e,t){const r=[...e];for(const i of t){const s=r.findIndex(o=>o.name===i.name);s<0?r.push(i):r[s]=i}return r}}function Ww(n,e){const t=sy(n),r=e.slice();return r.sort((i,s)=>{const o=Gc(To(i).map(c=>t[c])),a=Gc(To(s).map(c=>t[c]));return o-a}),r}function si(n,e){if(!n||!e.some(r=>{var i;return(i=r.bindingLayout)==null?void 0:i.length}))return n;const t={...n,bindings:n.bindings.map(r=>({...r}))};"attributes"in(n||{})&&(t.attributes=(n==null?void 0:n.attributes)||[]);for(const r of e)for(const i of r.bindingLayout||[])for(const s of Xw(i.name)){const o=t.bindings.find(a=>a.name===s);(o==null?void 0:o.group)===0&&(o.group=i.group),o&&i.visibility!==void 0&&(o.visibility=i.visibility)}return t}function Hw(n,e,t=[]){return n?e?{...n,attributes:n.attributes.length?Yw(n.attributes,e.attributes.filter(r=>t.includes(r.name))):e.attributes,bindings:qw(n.bindings,e.bindings)}:n:e}function Di(n){return!!(n.uniformTypes&&!Kw(n.uniformTypes))}function jw(n){const e=[];for(const t of n){const r=wa(t),i=new Set([t.vs,t.fs].flatMap(o=>o?Ta(o).filter(a=>a.isStd140).map(a=>a.blockName):[])),s=i.has(r)?r:i.size===1?i.values().next().value:void 0;Di(t)&&s&&e.push({name:s,uniformTypes:t.uniformTypes})}return e}function Cd(n,e){const t=[],r=new Set;for(const i of[...n||[],...e||[]])r.has(i.name)||(r.add(i.name),t.push(i));return t}function Xw(n){const e=new Set([n,`${n}Uniforms`]);return n.endsWith("Uniforms")||e.add(`${n}Sampler`),[...e]}function Kw(n){for(const e in n)return!1;return!0}function qw(n,e){const t=n.map(s=>({...s})),r=new Set(n.map(s=>s.name)),i=new Set(n.map(s=>`${s.group}:${s.location}`));for(const s of e){const o=`${s.group}:${s.location}`;!r.has(s.name)&&!i.has(o)&&t.push({...s})}return t}function Yw(n,e){const t=n.map(s=>({...s})),r=new Map(n.map(s=>[s.name,s])),i=new Map(n.map(s=>[s.location,s]));for(const s of e){const o=r.get(s.name);if(o){if(o.type!==s.type||o.location!==s.location)throw new Error(`Shader attribute "${s.name}" conflicts with its inferred type or location`);continue}const a=i.get(s.location);if(a)throw new Error(`Shader attributes "${a.name}" and "${s.name}" both use location ${s.location}`);t.push({...s})}return t}function Qw(n){return ff(n)||typeof n=="number"||typeof n=="boolean"}function Zw(n,e={}){const t={bindings:{},uniforms:{}};return Object.keys(n).forEach(r=>{const i=n[r];Object.prototype.hasOwnProperty.call(e,r)||Qw(i)?t.uniforms[r]=i:t.bindings[r]=i}),t}class ki{constructor(e,t){f(this,"options",{disableWarnings:!1});f(this,"modules");f(this,"moduleUniforms");f(this,"moduleBindings");f(this,"directBindings",{});Object.assign(this.options,t);const r=Xr(Object.values(e).filter(Jw));for(const i of r)e[i.name]=i;S.log(1,"Creating ShaderInputs with modules",Object.keys(e))(),this.modules=e,this.moduleUniforms={},this.moduleBindings={};for(const[i,s]of Object.entries(e))s&&(this._addModule(s),s.name&&i!==s.name&&!this.options.disableWarnings&&S.warn(`Module name: ${i} vs ${s.name}`)())}destroy(){}setProps(e){var t;e.bindings&&Object.assign(this.directBindings,e.bindings);for(const r of Object.keys(e)){if(r==="bindings")continue;const i=r,s=e[i]||{},o=this.modules[i];if(!o)this.options.disableWarnings||S.warn(`Module ${r} not found`)();else{const a=this.moduleUniforms[i],c=this.moduleBindings[i],l=((t=o.getUniforms)==null?void 0:t.call(o,s,a))||s,{uniforms:u,bindings:d}=Zw(l,o.uniformTypes);this.moduleUniforms[i]=Nl(a,u,o.uniformTypes),this.moduleBindings[i]={...c,...d}}}}getModules(){return Object.values(this.modules)}addModules(e){const t=Xr(e);for(const r of t){const i=r.name;this.modules[i]||(this.modules[i]=r,this._addModule(r))}}getUniformValues(){return this.moduleUniforms}getBindingValues(){const e={};for(const t of Object.values(this.moduleBindings))Object.assign(e,t);return Object.assign(e,this.directBindings),e}getModuleBindingValues(e){const t=this.moduleBindings[e];return t?{...t}:{}}getDebugTable(){var t;const e={};for(const[r,i]of Object.entries(this.moduleUniforms))for(const[s,o]of Object.entries(i))e[`${r}.${s}`]={type:(t=this.modules[r].uniformTypes)==null?void 0:t[s],value:String(o)};return e}_addModule(e){const t=e.name;this.moduleUniforms[t]=Nl({},e.defaultUniforms||{},e.uniformTypes),this.moduleBindings[t]={}}}function Nl(n={},e={},t={}){const r={...n};for(const[i,s]of Object.entries(e))s!==void 0&&(r[i]=ko(n[i],s,t[i]));return r}function ko(n,e,t){if(!t||typeof t=="string")return Sn(e);if(Array.isArray(t)){if($o(e)||!Array.isArray(e))return Sn(e);const o=Array.isArray(n)&&!$o(n)?[...n]:[],a=o.slice();for(let c=0;c<e.length;c++){const l=e[c];l!==void 0&&(a[c]=ko(o[c],l,t[0]))}return a}if(!Vo(e))return Sn(e);const r=t,i=Vo(n)?n:{},s={...i};for(const[o,a]of Object.entries(e))a!==void 0&&(s[o]=ko(i[o],a,r[o]));return s}function Sn(n){return ArrayBuffer.isView(n)?Array.prototype.slice.call(n):Array.isArray(n)?$o(n)?n.slice():n.map(t=>t===void 0?void 0:Sn(t)):Vo(n)?Object.fromEntries(Object.entries(n).map(([e,t])=>[e,t===void 0?void 0:Sn(t)])):n}function $o(n){return ArrayBuffer.isView(n)||Array.isArray(n)&&(n.length===0||typeof n[0]=="number")}function Vo(n){return!!n&&typeof n=="object"&&!Array.isArray(n)&&!ArrayBuffer.isView(n)}function Jw(n){return!!(n!=null&&n.dependencies)}const eT=F.DEBUG_DATA_MAX_LENGTH;class ue{constructor(e,t){f(this,"device");f(this,"id");f(this,"ready");f(this,"usage");f(this,"props");f(this,"isReady",!0);f(this,"destroyed",!1);f(this,"generation",0);f(this,"updateTimestamp");f(this,"debugData",new ArrayBuffer(0));f(this,"_debugDataEnabled");f(this,"_maxDebugDataByteLength");f(this,"_ownsBuffer");f(this,"_buffer");const{debugData:r=!1,buffer:i,ownsBuffer:s=!0,...o}=t;if(i&&i.device!==e)throw new Error("DynamicBuffer adopted buffers must belong to the supplied device");if(i&&(o.byteLength!==void 0||o.data!==void 0))throw new Error("DynamicBuffer cannot combine an adopted buffer with byteLength or data");const a=t.id||(i==null?void 0:i.id)||tt("dynamic-buffer"),c={...o,id:a,usage:o.usage??(i==null?void 0:i.usage),indexType:o.indexType??(i==null?void 0:i.indexType)};(c.usage||0)&F.INDEX&&!c.indexType&&(o.data instanceof Uint32Array?c.indexType="uint32":o.data instanceof Uint16Array?c.indexType="uint16":o.data instanceof Uint8Array&&(c.indexType="uint8")),delete c.data,delete c.byteOffset,this.device=e,this.id=a,this.props=c,this.usage=c.usage||0,this._debugDataEnabled=!!r,this._maxDebugDataByteLength=typeof r=="object"&&r.maxByteLength!==void 0?r.maxByteLength:eT,this._ownsBuffer=s,this._buffer=i??this.device.createBuffer({...o,id:a}),this.ready=Promise.resolve(this._buffer),this.updateTimestamp=this._buffer.updateTimestamp,this._resetDebugData(this._buffer.byteLength),o.data&&this._writeDebugData(o.data,o.byteOffset||0)}get buffer(){return this._buffer}get byteLength(){return this._buffer.byteLength}get[Symbol.toStringTag](){return"DynamicBuffer"}toString(){return`DynamicBuffer:"${this.id}":${this.byteLength}B`}toJSON(){return this.toString()}write(e,t=0){this._buffer.write(e,t),this._touch(),this._writeDebugData(e,t)}async mapAndWriteAsync(e,t=0,r=this.byteLength-t){let i=null;await this._buffer.mapAndWriteAsync(async(s,o)=>{await e(s,o),i=new Uint8Array(s.slice(0,r))},t,r),this._touch(),i&&this._writeDebugData(i,t)}async readAsync(e=0,t=this.byteLength-e){const r=await this._buffer.readAsync(e,t);return this._writeDebugData(r,e)&&this._touch(),r}async mapAndReadAsync(e,t=0,r=this.byteLength-t){let i=null;const s=await this._buffer.mapAndReadAsync(async(o,a)=>(i=new Uint8Array(o.slice(0)),await e(o,a)),t,r);return i&&this._writeDebugData(i,t)&&this._touch(),s}resize(e){const{byteLength:t,preserveData:r=!1}=e;if(t===this.byteLength)return!1;const i=Math.min(e.copyByteLength??Math.min(this.byteLength,t),this.byteLength,t),s=this._buffer,o=this.debugData.slice(0),{data:a,byteOffset:c,...l}=this.props,u=this.device.createBuffer({...l,byteLength:t});return r&&i>0&&this._copyBufferContents(s,u,i),this._buffer=u,this._resetDebugData(t),r&&o.byteLength>0&&this._writeDebugData(o,0),this._ownsBuffer&&s.destroy(),this._ownsBuffer=!0,this.generation++,this._touch(),!0}ensureSize(e,t){return e<=this.byteLength?!1:this.resize({byteLength:e,preserveData:t==null?void 0:t.preserveData})}getBinding(e){return(e==null?void 0:e.offset)===void 0&&(e==null?void 0:e.size)===void 0?this._buffer:{buffer:this._buffer,offset:e==null?void 0:e.offset,size:e==null?void 0:e.size}}destroy(){this.destroyed||(this._ownsBuffer&&this._buffer.destroy(),this.destroyed=!0,this.debugData=new ArrayBuffer(0))}_copyBufferContents(e,t,r){const i=this.device.type==="webgpu"?Math.ceil(r/4)*4:r,s=this.device.createCommandEncoder();s.copyBufferToBuffer({sourceBuffer:e,destinationBuffer:t,size:i}),this.device.submit(s.finish())}_touch(){this.updateTimestamp=this.device.incrementTimestamp()}_resetDebugData(e){if(!this._debugDataEnabled){this.debugData=new ArrayBuffer(0);return}this.debugData=new ArrayBuffer(Math.min(e,this._maxDebugDataByteLength))}_writeDebugData(e,t){if(!this._debugDataEnabled||this.debugData.byteLength===0||t>=this.debugData.byteLength)return!1;const r=ArrayBuffer.isView(e)?new Uint8Array(e.buffer,e.byteOffset,e.byteLength):new Uint8Array(e),i=new Uint8Array(this.debugData),s=Math.min(r.byteLength,i.byteLength-t);return i.set(r.subarray(0,s),t),s>0}}function Vn(n){return n!==null&&typeof n=="object"&&"buffer"in n}function tT(n){return n instanceof ue?n:Vn(n)&&n.buffer instanceof ue?n.buffer:null}function nT(n){return n instanceof ue?n.buffer:n}function Pd(n){return{buffer:nT(n.buffer),offset:n.offset,size:n.size}}function ut(n){return n!==null&&typeof n=="object"&&"resolveTextureBinding"in n&&typeof n.resolveTextureBinding=="function"}function rT(n){return(n==null?void 0:n.type)==="texture"||(n==null?void 0:n.type)==="external-texture"}function Bd(n,e,t){const r=Ff(n,e,{ignoreWarnings:!0});return rT(r)?r:n.bindings.length===0&&(t==null?void 0:t.fallbackGroup)!==void 0?{type:"texture",name:e,group:t.fallbackGroup,location:0}:null}const Ne=2,iT=1e4,As="render pipeline initialization failed",sT=["stencil8","depth16unorm","depth24plus","depth24plus-stencil8","depth32float","depth32float-stencil8"],Cn=class Cn{constructor(e,t){f(this,"device");f(this,"id");f(this,"source");f(this,"vs");f(this,"fs");f(this,"pipelineFactory");f(this,"shaderFactory");f(this,"userData",{});f(this,"parameters");f(this,"topology");f(this,"bufferLayout");f(this,"isInstanced");f(this,"instanceCount",0);f(this,"vertexCount");f(this,"indexCount");f(this,"firstVertex");f(this,"firstIndex");f(this,"indexBuffer",null);f(this,"bufferAttributes",{});f(this,"constantAttributes",{});f(this,"bindings",{});f(this,"vertexArray");f(this,"transformFeedback",null);f(this,"pipeline");f(this,"shaderInputs");f(this,"material",null);f(this,"_uniformStore");f(this,"_attributeInfos",{});f(this,"_gpuGeometry",null);f(this,"props");f(this,"_dynamicIndexBufferSource",null);f(this,"_dynamicAttributeBufferSources",{});f(this,"_colorAttachmentFormats");f(this,"_depthStencilAttachmentFormat");f(this,"_pipelineNeedsUpdate","newly created");f(this,"_needsRedraw","initializing");f(this,"_drawBlockedReason",!1);f(this,"_destroyed",!1);f(this,"_vertexCountSet",!1);f(this,"_lastDrawTimestamp",-1);f(this,"_bindingTable",[]);f(this,"_lastLogTime",0);f(this,"_logOpen",!1);f(this,"_drawCount",0);var m;const r=Cn.defaultProps.shaderAssembler,i=t.vertexCount!==void 0;this.props={...Cn.defaultProps,...t,shaderAssembler:t.shaderAssembler??(Rs(r,e.info.shadingLanguage)?r:mt.getDefaultShaderAssembler(e.info.shadingLanguage))},this._vertexCountSet=i,t=this.props,this.id=t.id||tt("model"),this.device=e,Object.assign(this.userData,t.userData),this.material=t.material||null;const s=uT(e),o=Wf(this.props.plugins,s.shaderLanguage),a=Hf(this.props.modules,o.modules),c=Object.fromEntries(a.map(p=>[p.name,p])),l=t.shaderInputs||new ki(c,{disableWarnings:this.props.disableWarnings});t.shaderInputs&&o.modules.length>0&&l.addModules(o.modules),this.setShaderInputs(l);const u=Cd(this.props.modules,l.getModules()),d={...o.defines,...this.props.defines};if(this.device.type==="webgl"&&(this.props._uniformBlockLayouts=jw(u)),this.props.shaderLayout=si(this.props.shaderLayout,u)||null,this.device.type==="webgpu"&&this.props.source){const p=this.props.shaderAssembler;Fn(Rs(p,"wgsl"));const{source:g,getUniforms:b,bindingTable:_,shaderLayout:y}=p.assembleWGSLShader({platformInfo:s,...this.props,modules:u,defines:d,pluginInjections:o.injections,pluginVertexInputs:o.vertexInputs,pluginVaryings:o.varyings});this.source=g,this._getModuleUniforms=b,this._bindingTable=_;const v=y??((m=e.getShaderLayout)==null?void 0:m.call(e,this.source)),w=oT(v,o.vertexInputs),x=Hw(this.props.shaderLayout,w,Object.keys(o.vertexInputs));this.props.shaderLayout=si(x||null,u)||null}else{const p=this.props.shaderAssembler;Fn(Rs(p,"glsl"));const{vs:g,fs:b,getUniforms:_}=p.assembleGLSLShaderPair({platformInfo:s,...this.props,modules:u,defines:d,pluginInjections:o.injections,pluginVertexInputs:o.vertexInputs,pluginVaryings:o.varyings});this.vs=g,this.fs=b,this._getModuleUniforms=_,this._bindingTable=[]}this.vertexCount=this.props.vertexCount,this.indexCount=this.props.indexCount,this.firstVertex=this.props.firstVertex,this.firstIndex=this.props.firstIndex,this.instanceCount=this.props.instanceCount,this.topology=this.props.topology,this.bufferLayout=this.props.bufferLayout,this.parameters=this.props.parameters,this._colorAttachmentFormats=this.props.colorAttachmentFormats,this._depthStencilAttachmentFormat=this.props.depthStencilAttachmentFormat,t.geometry&&this.setGeometry(t.geometry),this.pipelineFactory=t.pipelineFactory||Zr.getDefaultPipelineFactory(this.device),this.shaderFactory=t.shaderFactory||Jr.getDefaultShaderFactory(this.device),this.pipeline=this._updatePipeline(),this.vertexArray=e.createVertexArray({shaderLayout:this.pipeline.shaderLayout,bufferLayout:this.pipeline.bufferLayout}),this._gpuGeometry&&this._setGeometryAttributes(this._gpuGeometry),"isInstanced"in t&&(this.isInstanced=t.isInstanced),t.instanceCount&&this.setInstanceCount(t.instanceCount),t.vertexCount&&this.setVertexCount(t.vertexCount),t.indexBuffer&&this.setIndexBuffer(t.indexBuffer),t.attributes&&this.setAttributes(t.attributes),t.constantAttributes&&this.setConstantAttributes(t.constantAttributes),t.bindings&&this.setBindings(t.bindings),t.transformFeedback&&(this.transformFeedback=t.transformFeedback)}get[Symbol.toStringTag](){return"Model"}toString(){return`Model(${this.id})`}destroy(){var e;this._destroyed||(this.pipelineFactory.release(this.pipeline),this.shaderFactory.release(this.pipeline.vs),this.pipeline.fs&&this.pipeline.fs!==this.pipeline.vs&&this.shaderFactory.release(this.pipeline.fs),this._uniformStore.destroy(),(e=this._gpuGeometry)==null||e.destroy(),this._destroyed=!0)}needsRedraw(){this._getBindingsUpdateTimestamp()>this._lastDrawTimestamp&&this.setNeedsRedraw("contents of bound textures or buffers updated");const e=this._needsRedraw;return this._needsRedraw=!1,e}setNeedsRedraw(e){this._needsRedraw||(this._needsRedraw=e)}getBindingDebugTable(){return this._bindingTable}predraw(e){var t;this._syncDynamicBuffers(),this.updateShaderInputs(e),(t=this.material)==null||t.updateShaderInputs(e),this.pipeline=this._updatePipeline()}draw(e){var s;if(this._drawBlockedReason&&!this._pipelineNeedsUpdate)return S.info(Ne,`>>> DRAWING ABORTED ${this.id}: ${this._drawBlockedReason}`)(),!1;const t=this._areBindingsLoading();if(t)return S.info(Ne,`>>> DRAWING ABORTED ${this.id}: ${t} not loaded`)(),!1;this._syncAttachmentFormats(e);try{e.pushDebugGroup(`${this}.predraw(${e})`),this.device.type==="webgpu"?(this.updateShaderInputs(),(s=this.material)==null||s.updateShaderInputs(),this._syncDynamicBuffers(),this.pipeline=this._updatePipeline()):this.predraw(this.device.commandEncoder)}finally{e.popDebugGroup()}let r,i=this.pipeline.isErrored;try{if(e.pushDebugGroup(`${this}.draw(${e})`),this._logDrawCallStart(),this.pipeline=this._updatePipeline(),i=this.pipeline.isErrored,i)S.info(Ne,`>>> DRAWING ABORTED ${this.id}: ${As}`)(),r=!1;else{const o=this.vertexArray.getDrawValidationError();if(o)S.info(Ne,`>>> DRAWING ABORTED ${this.id}: ${o}`)(),this._drawBlockedReason=o,r=!1;else{const a=this._getCurrentShaderLayout(),c=this._getBindings(a),l=this._getBindGroups(a,c),{indexBuffer:u}=this.vertexArray,d=u?this.indexCount??(this._vertexCountSet?this.vertexCount:u.byteLength/(u.indexType==="uint32"?4:2)):void 0;e.setPipeline(this.pipeline),e.setBindings(l,{_bindGroupCacheKeys:this._getBindGroupCacheKeys()}),e.setVertexArray(this.vertexArray),r=this.isInstanced===!0&&this.instanceCount===0?!0:e.draw({isInstanced:this.isInstanced,vertexCount:this.vertexCount,instanceCount:this.isInstanced?this.instanceCount:void 0,indexCount:d,firstVertex:this.firstVertex,firstIndex:this.firstIndex,transformFeedback:this.transformFeedback||void 0,uniforms:this.props.uniforms,parameters:this.parameters,topology:this.topology})}}}finally{e.popDebugGroup(),this._logDrawCallEnd()}return this._logFramebuffer(e),r?(this._lastDrawTimestamp=this.device.timestamp,this._needsRedraw=!1):i?(this._needsRedraw=As,this._drawBlockedReason=As):this._drawBlockedReason?this._needsRedraw=this._drawBlockedReason:this._needsRedraw="waiting for resource initialization",r}setGeometry(e){var r;(r=this._gpuGeometry)==null||r.destroy();const t=e&&Nw(this.device,e);if(t){this.setTopology(t.topology||"triangle-list");const i=new Es(this.bufferLayout);this.bufferLayout=i.mergeBufferLayouts(t.bufferLayout,this.bufferLayout),this.vertexArray&&this._setGeometryAttributes(t)}this._gpuGeometry=t}setTopology(e){e!==this.topology&&(this.topology=e,this._setPipelineNeedsUpdate("topology"))}setBufferLayout(e){const t=new Es(this.bufferLayout),r=this._gpuGeometry?t.mergeBufferLayouts(e,this._gpuGeometry.bufferLayout):e;xn(r,this.bufferLayout,-1)||(this.bufferLayout=r,this._setPipelineNeedsUpdate("bufferLayout"),this.pipeline=this._updatePipeline(),this.vertexArray=this.device.createVertexArray({shaderLayout:this.pipeline.shaderLayout,bufferLayout:this.pipeline.bufferLayout}),this._gpuGeometry&&this._setGeometryAttributes(this._gpuGeometry))}setParameters(e){xn(e,this.parameters,2)||(this.parameters=e,this._setPipelineNeedsUpdate("parameters"))}setInstanceCount(e){this.instanceCount=e,this.isInstanced===void 0&&e>0&&(this.isInstanced=!0),this.setNeedsRedraw("instanceCount")}setVertexCount(e){this.vertexCount=e,this._vertexCountSet=!0,this.setNeedsRedraw("vertexCount")}setIndexCount(e){this.indexCount=e,this.setNeedsRedraw("indexCount")}setDrawOffsets({firstVertex:e,firstIndex:t}){this.firstVertex=e,this.firstIndex=t,this.setNeedsRedraw("drawOffsets")}setShaderInputs(e){var t;this.shaderInputs=e,this._uniformStore=new Sa(this.device,this.shaderInputs.modules);for(const[r,i]of Object.entries(this.shaderInputs.modules))if(Di(i)&&!((t=this.material)!=null&&t.ownsModule(r))){const s=this._uniformStore.getManagedUniformBuffer(r);this.bindings[`${r}Uniforms`]=s}this.setNeedsRedraw("shaderInputs")}setMaterial(e){this.material=e,this.setNeedsRedraw("material")}updateShaderInputs(e){this._uniformStore.setUniforms(this.shaderInputs.getUniformValues(),e),this.setBindings(this._getNonMaterialBindings(this.shaderInputs.getBindingValues())),this.setNeedsRedraw("shaderInputs")}setBindings(e){Object.assign(this.bindings,e),this.setNeedsRedraw("bindings")}setTransformFeedback(e){this.transformFeedback=e,this.setNeedsRedraw("transformFeedback")}setIndexBuffer(e){const t=e instanceof ue?e.buffer:e;this.indexBuffer=t,this._dynamicIndexBufferSource=e instanceof ue?{source:e,generation:e.generation}:null,this.vertexArray.setIndexBuffer(t),this.setNeedsRedraw("indexBuffer")}setAttributes(e,t){this._drawBlockedReason=!1;const r=(t==null?void 0:t.disableWarnings)??this.props.disableWarnings;e.indices&&S.warn(`Model:${this.id} setAttributes() - indexBuffer should be set using setIndexBuffer()`)(),this.bufferLayout=Ww(this.pipeline.shaderLayout,this.bufferLayout);const i=new Es(this.bufferLayout);for(const[s,o]of Object.entries(e)){const a=o instanceof ue?o.buffer:o,c=i.getBufferLayout(s);if(!c){r||S.warn(`Model(${this.id}): Missing layout for buffer "${s}".`)();continue}const l=i.getAttributeNamesForBuffer(c);let u=!1;for(const d of l){const h=this._attributeInfos[d];if(h){const m=this.device.type==="webgpu"?this.vertexArray.getBufferSlot(h.bufferName):h.location;if(m===null){r||S.warn(`Model(${this.id}): Missing vertex array slot for buffer "${h.bufferName}".`)();continue}this.vertexArray.setBuffer(m,a),o instanceof ue?this._dynamicAttributeBufferSources[m]={source:o,generation:o.generation}:delete this._dynamicAttributeBufferSources[m],u=!0}}!u&&!r&&S.warn(`Model(${this.id}): Ignoring buffer "${a.id}" for unknown attribute "${s}"`)()}this.setNeedsRedraw("attributes")}setConstantAttributes(e,t){for(const[r,i]of Object.entries(e)){const s=this._attributeInfos[r];s?this.vertexArray.setConstantWebGL(s.location,i):((t==null?void 0:t.disableWarnings)??this.props.disableWarnings)||S.warn(`Model "${this.id}: Ignoring constant supplied for unknown attribute "${r}"`)()}this.setNeedsRedraw("constants")}_areBindingsLoading(){var e;for(const t of Object.values(this.bindings))if(ut(t)&&!t.isReady)return t.id;for(const t of Object.values(((e=this.material)==null?void 0:e.bindings)||{}))if(ut(t)&&!t.isReady)return t.id;return!1}_getBindings(e=this._getCurrentShaderLayout()){const t={};for(const[r,i]of Object.entries(this.bindings)){const s=aT(r,i,e);s&&(t[r]=s)}return t}_getBindGroups(e=this._getCurrentShaderLayout(),t=this._getBindings(e)){const r=e.bindings.length?_a(e,t):{0:t};if(!this.material)return r;for(const[i,s]of Object.entries(this.material.getBindingsByGroup(e))){const o=Number(i);r[o]={...r[o]||{},...s}}return r}_getBindGroupCacheKeys(){var t;const e=(t=this.material)==null?void 0:t.getBindGroupCacheKey(3);return e?{3:e}:{}}_getBindingsUpdateTimestamp(){var t;let e=0;this._dynamicIndexBufferSource&&(e=Math.max(e,this._dynamicIndexBufferSource.source.updateTimestamp));for(const r of Object.values(this._dynamicAttributeBufferSources))e=Math.max(e,r.source.updateTimestamp);for(const r of Object.values(this.bindings))r instanceof Vt?e=Math.max(e,r.texture.updateTimestamp):r instanceof F||r instanceof N||r instanceof qr||r instanceof ue?e=Math.max(e,r.updateTimestamp):ut(r)?e=r.isReady?Math.max(e,r.updateTimestamp):1/0:Vn(r)&&(e=Math.max(e,(r.buffer instanceof ue,r.buffer.updateTimestamp)));return Math.max(e,((t=this.material)==null?void 0:t.getBindingsUpdateTimestamp())||0)}_setGeometryAttributes(e){const t={...e.attributes};for(const[r]of Object.entries(t))!this.pipeline.shaderLayout.attributes.find(i=>i.name===r)&&r!=="positions"&&delete t[r];this.vertexCount=e.vertexCount,this._vertexCountSet=!0,this.setIndexBuffer(e.indices||null),this.setAttributes(e.attributes,{disableWarnings:!0}),this.setAttributes(t,{disableWarnings:this.props.disableWarnings}),this.setNeedsRedraw("geometry attributes")}_setPipelineNeedsUpdate(e){this._pipelineNeedsUpdate||(this._pipelineNeedsUpdate=e),this._drawBlockedReason=!1,this.setNeedsRedraw(e)}_updatePipeline(){if(this._pipelineNeedsUpdate){let e=null,t=null;this.pipeline&&(S.log(1,`Model ${this.id}: Recreating pipeline because "${this._pipelineNeedsUpdate}".`)(),e=this.pipeline.vs,t=this.pipeline.fs),this._pipelineNeedsUpdate=!1;const r=this.shaderFactory.createShader({id:`${this.id}-vertex`,stage:"vertex",source:this.source||this.vs,debugShaders:this.props.debugShaders});let i=null;this.source?i=r:this.fs&&(i=this.shaderFactory.createShader({id:`${this.id}-fragment`,stage:"fragment",source:this.source||this.fs,debugShaders:this.props.debugShaders})),this.pipeline=this.pipelineFactory.createRenderPipeline({...this.props,bindings:void 0,bufferLayout:this.bufferLayout,colorAttachmentFormats:this._colorAttachmentFormats,depthStencilAttachmentFormat:this._depthStencilAttachmentFormat,topology:this.topology,parameters:this.parameters,bindGroups:void 0,vs:r,fs:i}),this._attributeInfos=zf(this.pipeline.shaderLayout,this.bufferLayout),e&&this.shaderFactory.release(e),t&&t!==e&&this.shaderFactory.release(t)}return this.pipeline}_logDrawCallStart(){const e=S.level>3?0:iT;S.level<2||Date.now()-this._lastLogTime<e||(this._lastLogTime=Date.now(),this._logOpen=!0,S.group(Ne,`>>> DRAWING MODEL ${this.id}`,{collapsed:S.level<=2})())}_logDrawCallEnd(){if(this._logOpen){const e=Uw(this.pipeline.shaderLayout,this.id);S.table(Ne,e)();const t=this.shaderInputs.getDebugTable();S.table(Ne,t)();const r=this._getAttributeDebugTable();S.table(Ne,this._attributeInfos)(),S.table(Ne,r)(),S.groupEnd(Ne)(),this._logOpen=!1}}_logFramebuffer(e){const t=this.device.props.debugFramebuffers;if(this._drawCount++,!t)return;const r=e.props.framebuffer;Dw(e,r,{id:(r==null?void 0:r.id)||`${this.id}-framebuffer`,minimap:!0})}_getAttributeDebugTable(){const e={};for(const[t,r]of Object.entries(this._attributeInfos)){const i=this.vertexArray.attributes[r.location];e[r.location]={name:t,type:r.shaderType,values:i?this._getBufferOrConstantValues(i,r.bufferDataType):"null"}}if(this.vertexArray.indexBuffer){const{indexBuffer:t}=this.vertexArray,r=t.indexType==="uint32"?new Uint32Array(t.debugData):new Uint16Array(t.debugData);e.indices={name:"indices",type:t.indexType,values:r.toString()}}return e}_getBufferOrConstantValues(e,t){const r=Ze.getTypedArrayConstructor(t);return(e instanceof F?new r(e.debugData):e).toString()}_getNonMaterialBindings(e){if(!this.material)return e;const t={};for(const[r,i]of Object.entries(e))this.material.ownsBinding(r)||(t[r]=i);return t}_getCurrentShaderLayout(){var e;return((e=this.pipeline)==null?void 0:e.shaderLayout)||this.props.shaderLayout||{bindings:[]}}_syncDynamicBuffers(){if(this._dynamicIndexBufferSource&&this._dynamicIndexBufferSource.generation!==this._dynamicIndexBufferSource.source.generation){const e=this._dynamicIndexBufferSource.source.buffer;this.indexBuffer=e,this.vertexArray.setIndexBuffer(e),this._dynamicIndexBufferSource.generation=this._dynamicIndexBufferSource.source.generation,this.setNeedsRedraw("dynamic index buffer")}for(const[e,t]of Object.entries(this._dynamicAttributeBufferSources))t.generation!==t.source.generation&&(this.vertexArray.setBuffer(Number(e),t.source.buffer),t.generation=t.source.generation,this.setNeedsRedraw("dynamic attribute buffer"))}_syncAttachmentFormats(e){var o,a,c;if(this.device.type!=="webgpu")return;const t=e.framebuffer||e.props.framebuffer,r=e.props,i=r.colorAttachmentFormats??((o=t==null?void 0:t.colorAttachments)==null?void 0:o.map(l=>{var u;return cT((u=l==null?void 0:l.texture)==null?void 0:u.format)})),s=r.depthStencilAttachmentFormat===!1?void 0:r.depthStencilAttachmentFormat??lT((c=(a=t==null?void 0:t.depthStencilAttachment)==null?void 0:a.texture)==null?void 0:c.format);(!xn(this._colorAttachmentFormats,i,1)||this._depthStencilAttachmentFormat!==s)&&(this._colorAttachmentFormats=i,this._depthStencilAttachmentFormat=s,this._setPipelineNeedsUpdate("attachment formats"))}};f(Cn,"defaultProps",{...Ye.defaultProps,source:void 0,vs:null,fs:null,id:"unnamed",handle:void 0,userData:{},defines:{},modules:[],plugins:[],geometry:null,indexBuffer:null,indexCount:void 0,firstVertex:0,firstIndex:0,attributes:{},constantAttributes:{},bindings:{},uniforms:{},varyings:[],isInstanced:void 0,instanceCount:0,vertexCount:0,shaderInputs:void 0,material:void 0,pipelineFactory:void 0,shaderFactory:void 0,transformFeedback:void 0,shaderAssembler:mt.getDefaultShaderAssembler("glsl"),debugShaders:void 0,disableWarnings:void 0});let Ht=Cn;function Rs(n,e){return n.shaderLanguage!==void 0&&n.shaderLanguage!==e?!1:e==="glsl"?"assembleGLSLShaderPair"in n&&typeof n.assembleGLSLShaderPair=="function":"assembleWGSLShader"in n&&typeof n.assembleWGSLShader=="function"}function oT(n,e){return!n||Object.keys(e).length===0?n:{...n,attributes:n.attributes.map(t=>{const r=t.name.startsWith("_luma_")?t.name.slice(6):null;return r&&e[r]?{...t,name:r}:t})}}function aT(n,e,t){if(ut(e)){const r=Bd(t,n,{fallbackGroup:0});return r?e.resolveTextureBinding(r):null}return e instanceof ue?e.buffer:Vn(e)?Pd(e):e}function cT(n){return n&&!Nd(n)?n:null}function lT(n){return n&&Nd(n)?n:void 0}function Nd(n){return sT.includes(n)}function uT(n){return{type:n.type,shaderLanguage:n.info.shadingLanguage,shaderLanguageVersion:n.info.shadingLanguageVersion,gpu:n.info.gpu,limits:n.limits,features:n.features}}const Gn=3;class Va{constructor(e,t={}){f(this,"device");f(this,"modules");f(this,"_materialBindingNames");f(this,"_materialModuleNames");this.device=e,this.modules=t.modules||[];const r=new ki(Object.fromEntries(this.modules.map(i=>[i.name,i])));this._materialBindingNames=fT(r),this._materialModuleNames=dT(r)}createMaterial(e={}){return new hT(this.device,{...e,factory:this})}getBindingNames(){return Array.from(this._materialBindingNames)}ownsBinding(e){if(this._materialBindingNames.has(e))return!0;const t=Od(e);return t?this._materialModuleNames.has(t):!1}ownsModule(e){return this._materialModuleNames.has(e)}getBindingsByGroup(e){return Object.keys(e).length>0?{[Gn]:e}:{}}}function Od(n){return n.endsWith("Uniforms")?n.slice(0,-8):null}function fT(n){const e=new Set;for(const t of Object.values(n.modules))for(const r of t.bindingLayout||[])r.group===Gn&&e.add(r.name);return e}function dT(n){var t;const e=new Set;for(const r of Object.values(n.modules))r.name&&((t=r.bindingLayout)!=null&&t.some(i=>i.group===Gn&&i.name===r.name))&&e.add(r.name);return e}class hT{constructor(e,t={}){f(this,"id");f(this,"device");f(this,"factory");f(this,"shaderInputs");f(this,"bindings",{});f(this,"_uniformStore");f(this,"_bindGroupCacheToken",{});f(this,"_dynamicResourceGenerations",{});var i,s;this.id=t.id||tt("material"),this.device=e,this.factory=t.factory||new Va(e,{modules:t.modules||((i=t.shaderInputs)==null?void 0:i.getModules())||[]});const r=Object.fromEntries((((s=t.shaderInputs)==null?void 0:s.getModules())||this.factory.modules).map(o=>[o.name,o]));this.shaderInputs=t.shaderInputs||new ki(r),this._uniformStore=new Sa(this.device,this.shaderInputs.modules);for(const[o,a]of Object.entries(this.shaderInputs.modules))if(this.ownsModule(o)&&Di(a)){const c=this._uniformStore.getManagedUniformBuffer(o);this.bindings[`${o}Uniforms`]=c}this.updateShaderInputs(),t.bindings&&this._replaceOwnedBindings(t.bindings)}destroy(){this._uniformStore.destroy()}clone(e={}){const t=this.factory.createMaterial({id:e.id,shaderInputs:e.shaderInputs,bindings:{...this.getResourceBindings(),...e.bindings}});return e.shaderInputs||t.setProps(this.shaderInputs.getUniformValues()),e.moduleProps&&t.setProps(e.moduleProps),t.updateShaderInputs(),t}ownsBinding(e){return this.factory.ownsBinding(e)}ownsModule(e){return this.factory.ownsModule(e)}setProps(e){this.shaderInputs.setProps(e)}updateShaderInputs(e){this._uniformStore.setUniforms(this.shaderInputs.getUniformValues(),e),this._setOwnedBindings(this.shaderInputs.getBindingValues())&&(this._bindGroupCacheToken={})}getResourceBindings(){const e={};for(const[t,r]of Object.entries(this.bindings))Od(t)||(e[t]=r);return e}getBindings(e={bindings:[]}){this._syncDynamicResourceGenerations();const t={},r=t;for(const[i,s]of Object.entries(this.bindings))if(ut(s)){const o=Bd(e,i,{fallbackGroup:Gn}),a=o?s.resolveTextureBinding(o):null;a&&(r[i]=a)}else s instanceof ue?r[i]=s.buffer:Vn(s)?r[i]=Pd(s):r[i]=s;return this._syncDynamicResourceGenerations(),t}getBindingsByGroup(e={bindings:[]}){return this.factory.getBindingsByGroup(this.getBindings(e))}getBindGroupCacheKey(e){return this._syncDynamicResourceGenerations(),e===Gn?this._bindGroupCacheToken:null}getBindingsUpdateTimestamp(){let e=0;for(const t of Object.values(this.bindings))t instanceof Vt?e=Math.max(e,t.texture.updateTimestamp):t instanceof F||t instanceof N||t instanceof qr||t instanceof ue?e=Math.max(e,t.updateTimestamp):ut(t)?e=t.isReady?Math.max(e,t.updateTimestamp):1/0:Vn(t)&&(e=Math.max(e,(t.buffer instanceof ue,t.buffer.updateTimestamp)));return e}_replaceOwnedBindings(e){this._setOwnedBindings(e)&&(this._bindGroupCacheToken={})}_setOwnedBindings(e){let t=!1;for(const[r,i]of Object.entries(e))i!==void 0&&this.ownsBinding(r)&&this.bindings[r]!==i&&(this.bindings[r]=i,t=!0);return t}_syncDynamicResourceGenerations(){const e={};let t=!1;for(const[r,i]of Object.entries(this.bindings)){const s=mT(i);s!==null&&(e[r]=s,this._dynamicResourceGenerations[r]!==s&&(t=!0))}Object.keys(e).length!==Object.keys(this._dynamicResourceGenerations).length&&(t=!0),this._dynamicResourceGenerations=e,t&&(this._bindGroupCacheToken={})}}function mT(n){var e;return ut(n)?n.generation:((e=tT(n))==null?void 0:e.generation)??null}const pT=35980,gT=35981,Pn=class Pn{constructor(e,t=Pn.defaultProps){f(this,"device");f(this,"model");f(this,"transformFeedback");if(!Pn.isSupported(e))throw new Error("BufferTransform not yet implemented on WebGPU");this.device=e,this.model=new Ht(this.device,{id:t.id||"buffer-transform-model",fs:t.fs||H0(),topology:t.topology||"point-list",varyings:t.outputs||t.varyings,...t,bufferMode:t.bufferMode||(t.feedbackBufferMode==="interleaved"?pT:gT)}),this.transformFeedback=this.device.createTransformFeedback({layout:this.model.pipeline.shaderLayout,buffers:t.feedbackBuffers}),this.model.setTransformFeedback(this.transformFeedback)}static isSupported(e){var t;return((t=e==null?void 0:e.info)==null?void 0:t.type)==="webgl"}destroy(){this.model&&this.model.destroy()}delete(){this.destroy()}run(e){e!=null&&e.inputBuffers&&this.model.setAttributes(e.inputBuffers),e!=null&&e.outputBuffers&&this.transformFeedback.setBuffers(e.outputBuffers);const t=this.device.beginRenderPass({discard:!0,...e});this.model.draw(t),t.end()}getBuffer(e){return this.transformFeedback.getBuffer(e)}readAsync(e){const t=this.getBuffer(e);if(!t)throw new Error("BufferTransform#getBuffer");if(t instanceof F)return t.readAsync();const{buffer:r,byteOffset:i=0,byteLength:s=r.byteLength}=t;return r.readAsync(i,s)}};f(Pn,"defaultProps",{...Ht.defaultProps,feedbackBufferMode:"separate",outputs:void 0,feedbackBuffers:void 0});let jt=Pn;const Fd={"+X":0,"-X":1,"+Y":2,"-Y":3,"+Z":4,"-Z":5};function on(n){return n?Array.isArray(n)?n[0]??null:n:null}function bT(n){const{dimension:e,data:t}=n;if(!t)return null;switch(e){case"1d":{const r=on(t);if(!r)return null;const{width:i}=an(r);return{width:i,height:1}}case"2d":{if(ArrayBuffer.isView(t))return null;const r=on(t);return r?an(r):null}case"3d":case"2d-array":{if(!Array.isArray(t)||t.length===0)return null;const r=on(t[0]);return r?an(r):null}case"cube":{const r=Object.keys(t)[0]??null;if(!r)return null;const i=t[r],s=on(i);return s?an(s):null}case"cube-array":{if(!Array.isArray(t)||t.length===0)return null;const r=t[0],i=Object.keys(r)[0]??null;if(!i)return null;const s=on(r[i]);return s?an(s):null}default:return null}}function an(n){if(ba(n))return Bf(n);if(typeof n=="object"&&"width"in n&&"height"in n)return{width:n.width,height:n.height};throw new Error("Unsupported mip-level data")}function _T(n){return typeof n=="object"&&n!==null&&"data"in n&&"width"in n&&"height"in n}function yT(n){return ArrayBuffer.isView(n)}function Ud(n){const{textureFormat:e,format:t}=n;if(e&&t&&e!==t)throw new Error(`Conflicting texture formats "${e}" and "${t}" provided for the same mip level`);return e??t}function Dd(n){const e=Fd[n];if(e===void 0)throw new Error(`Invalid cube face: ${n}`);return e}function vT(n,e){return 6*n+Dd(e)}function kd(n){throw new Error("setTexture1DData not supported in WebGL.")}function xT(n){return Array.isArray(n)?n:[n]}function tn(n,e,t,r){const i=xT(e),s=n,o=[];for(let a=0;a<i.length;a++){const c=i[a];if(ba(c))o.push({type:"external-image",image:c,z:s,mipLevel:a});else if(_T(c))o.push({type:"texture-data",data:c,textureFormat:Ud(c),z:s,mipLevel:a});else if(yT(c)&&t)o.push({type:"texture-data",data:{data:c,width:Math.max(1,t.width>>a),height:Math.max(1,t.height>>a),...r?{format:r}:{}},textureFormat:r,z:s,mipLevel:a});else throw new Error("Unsupported 2D mip-level payload")}return o}function $d(n){const e=[];for(let t=0;t<n.length;t++)e.push(...tn(t,n[t]));return e}function Vd(n){const e=[];for(let t=0;t<n.length;t++)e.push(...tn(t,n[t]));return e}function Gd(n){const e=[];for(const[t,r]of Object.entries(n)){const i=Dd(t);e.push(...tn(i,r))}return e}function zd(n){const e=[];return n.forEach((t,r)=>{for(const[i,s]of Object.entries(t)){const o=vT(r,i);e.push(...tn(o,s))}}),e}const Ri=class Ri{constructor(e,t){f(this,"device");f(this,"id");f(this,"props");f(this,"_texture",null);f(this,"_sampler",null);f(this,"_view",null);f(this,"ready");f(this,"isReady",!1);f(this,"destroyed",!1);f(this,"generation",0);f(this,"updateTimestamp");f(this,"resolveReady",()=>{});f(this,"rejectReady",()=>{});this.device=e;const r=tt("dynamic-texture"),i=t;this.props={...Ri.defaultProps,id:r,...t,data:null},this.id=this.props.id,this.ready=new Promise((s,o)=>{this.resolveReady=s,this.rejectReady=o}),this.updateTimestamp=this.device.incrementTimestamp(),this.initAsync(i)}get texture(){if(!this._texture)throw new Error("Texture not initialized yet");return this._texture}get sampler(){if(!this._sampler)throw new Error("Sampler not initialized yet");return this._sampler}get view(){if(!this._view)throw new Error("View not initialized yet");return this._view}get[Symbol.toStringTag](){return"DynamicTexture"}toString(){var r,i;const e=((r=this._texture)==null?void 0:r.width)??this.props.width??"?",t=((i=this._texture)==null?void 0:i.height)??this.props.height??"?";return`DynamicTexture:"${this.id}":${e}x${t}px:(${this.isReady?"ready":"loading..."})`}resolveTextureBinding(e){return this.isReady?this.texture:null}async initAsync(e){try{const t=await this._loadAllData(e);this._checkNotDestroyed();const r=t.data?ST({...t,width:e.width,height:e.height,format:e.format}):[],i="format"in e&&e.format!==void 0,s="usage"in e&&e.usage!==void 0,a=(()=>{if(this.props.width&&this.props.height)return{width:this.props.width,height:this.props.height};const g=bT(t);return g||{width:this.props.width||1,height:this.props.height||1}})();if(!a||a.width<=0||a.height<=0)throw new Error(`${this} size could not be determined or was zero`);const c=wT(this.device,r,a,{format:i?e.format:void 0}),l=c.format??this.props.format,u={...this.props,...a,format:l,mipLevels:1,data:void 0};this.device.isTextureFormatCompressed(l)&&!s&&(u.usage=N.SAMPLE|N.COPY_DST);const d=this.props.mipmaps&&!c.hasExplicitMipChain&&!this.device.isTextureFormatCompressed(l);if(this.device.type==="webgpu"&&d){const g=this.props.dimension==="3d"?N.SAMPLE|N.STORAGE|N.COPY_DST|N.COPY_SRC:N.SAMPLE|N.RENDER|N.COPY_DST|N.COPY_SRC;u.usage|=g}const h=this.device.getMipLevelCount(u.width,u.height),m=c.hasExplicitMipChain?c.mipLevels:this.props.mipLevels==="auto"?h:Math.max(1,Math.min(h,this.props.mipLevels??1)),p={...u,mipLevels:m};this._texture=this.device.createTexture(p),this._sampler=this.texture.sampler,this._view=this.texture.view,this._touchGeneration(),c.subresources.length&&this._setTextureSubresources(c.subresources),this.props.mipmaps&&!c.hasExplicitMipChain&&!d&&S.warn(`${this} skipping auto-generated mipmaps for compressed texture format`)(),d&&this.generateMipmaps(),this.isReady=!0,this.resolveReady(this.texture),S.info(1,`${this} created`)()}catch(t){const r=t instanceof Error?t:new Error(String(t));this.rejectReady(r)}}destroy(){this._texture&&(this._texture.destroy(),this._texture=null,this._sampler=null,this._view=null),this.isReady=!1,this.destroyed=!0}generateMipmaps(){this.device.type==="webgl"?(this.texture.generateMipmapsWebGL(),this._touch()):this.device.type==="webgpu"?(this.device.generateMipmapsWebGPU(this.texture),this._touch()):S.warn(`${this} mipmaps not supported on ${this.device.type}`)}setSampler(e={}){this._checkReady();const t=e instanceof $t?e:this.device.createSampler(e);this.texture.setSampler(t),this._sampler=t,this._touchGeneration()}async readBuffer(e={}){this.isReady||await this.ready;const t=e.width??this.texture.width,r=e.height??this.texture.height,i=e.depthOrArrayLayers??this.texture.depth,s=this.texture.computeMemoryLayout({width:t,height:r,depthOrArrayLayers:i}),o=this.device.createBuffer({byteLength:s.byteLength,usage:F.COPY_DST|F.MAP_READ});this.texture.readBuffer({...e,width:t,height:r,depthOrArrayLayers:i},o);const a=this.device.createFence();return await a.signaled,a.destroy(),o}async readAsync(e={}){this.isReady||await this.ready;const t=e.width??this.texture.width,r=e.height??this.texture.height,i=e.depthOrArrayLayers??this.texture.depth,s=this.texture.computeMemoryLayout({width:t,height:r,depthOrArrayLayers:i}),o=await this.readBuffer(e),a=await o.readAsync(0,s.byteLength);return o.destroy(),a.buffer instanceof ArrayBuffer?a.buffer:a.slice().buffer}resize(e){if(this._checkReady(),e.width===this.texture.width&&e.height===this.texture.height)return!1;const t=this.texture;return this._texture=t.clone(e),this._sampler=this.texture.sampler,this._view=this.texture.view,t.destroy(),this._touchGeneration(),S.info(`${this} resized`),!0}getCubeFaceIndex(e){const t=Fd[e];if(t===void 0)throw new Error(`Invalid cube face: ${e}`);return t}getCubeArrayFaceIndex(e,t){return 6*e+this.getCubeFaceIndex(t)}setTexture1DData(e){if(this._checkReady(),this.texture.props.dimension!=="1d")throw new Error(`${this} is not 1d`);const t=kd();this._setTextureSubresources(t)}setTexture2DData(e,t=0){if(this._checkReady(),this.texture.props.dimension!=="2d")throw new Error(`${this} is not 2d`);const r=tn(t,e);this._setTextureSubresources(r)}setTexture3DData(e){if(this.texture.props.dimension!=="3d")throw new Error(`${this} is not 3d`);const t=$d(e);this._setTextureSubresources(t)}setTextureArrayData(e){if(this.texture.props.dimension!=="2d-array")throw new Error(`${this} is not 2d-array`);const t=Vd(e);this._setTextureSubresources(t)}setTextureCubeData(e){if(this.texture.props.dimension!=="cube")throw new Error(`${this} is not cube`);const t=Gd(e);this._setTextureSubresources(t)}setTextureCubeArrayData(e){if(this.texture.props.dimension!=="cube-array")throw new Error(`${this} is not cube-array`);const t=zd(e);this._setTextureSubresources(t)}_setTextureSubresources(e){for(const t of e){const{z:r,mipLevel:i}=t;switch(t.type){case"external-image":const{image:s,flipY:o}=t;this.texture.copyExternalImage({image:s,z:r,mipLevel:i,flipY:o});break;case"texture-data":const{data:a,textureFormat:c}=t;if(c&&c!==this.texture.format)throw new Error(`${this} mip level ${i} uses format "${c}" but texture format is "${this.texture.format}"`);this.texture.writeData(a.data,{x:0,y:0,z:r,width:a.width,height:a.height,depthOrArrayLayers:1,mipLevel:i});break;default:throw new Error("Unsupported 2D mip-level payload")}}e.length>0&&this._touch()}async _loadAllData(e){const t=await zo(e.data);return{dimension:e.dimension??"2d",data:t??null}}_checkNotDestroyed(){this.destroyed&&S.warn(`${this} already destroyed`)}_checkReady(){this.isReady||S.warn(`${this} Cannot perform this operation before ready`)}_touch(){this.updateTimestamp=this.device.incrementTimestamp()}_touchGeneration(){this.generation++,this._touch()}};f(Ri,"defaultProps",{...N.defaultProps,dimension:"2d",data:null,mipmaps:!1});let Go=Ri;function ST(n){if(!n.data)return[];const e=n.width&&n.height?{width:n.width,height:n.height}:void 0,t="format"in n?n.format:void 0;switch(n.dimension){case"1d":return kd();case"2d":return tn(0,n.data,e,t);case"3d":return $d(n.data);case"2d-array":return Vd(n.data);case"cube":return Gd(n.data);case"cube-array":return zd(n.data);default:throw new Error(`Unhandled dimension ${n.dimension}`)}}function wT(n,e,t,r){if(e.length===0)return{subresources:e,mipLevels:1,format:r.format,hasExplicitMipChain:!1};const i=new Map;for(const u of e){const d=i.get(u.z)??[];d.push(u),i.set(u.z,d)}const s=e.some(u=>u.mipLevel>0);let o=r.format,a=Number.POSITIVE_INFINITY;const c=[];for(const[u,d]of i){const h=[...d].sort((y,v)=>y.mipLevel-v.mipLevel),m=h[0];if(!m||m.mipLevel!==0)throw new Error(`DynamicTexture: slice ${u} is missing mip level 0`);const p=Fl(n,m);if(p.width!==t.width||p.height!==t.height)throw new Error(`DynamicTexture: slice ${u} base level dimensions ${p.width}x${p.height} do not match expected ${t.width}x${t.height}`);const g=Ol(m);if(g){if(o&&o!==g)throw new Error(`DynamicTexture: slice ${u} base level format "${g}" does not match texture format "${o}"`);o=g}const b=o&&n.isTextureFormatCompressed(o)?TT(n,p.width,p.height,o):n.getMipLevelCount(p.width,p.height);let _=0;for(let y=0;y<h.length;y++){const v=h[y];if(!v||v.mipLevel!==y||y>=b)break;const w=Fl(n,v),x=Math.max(1,p.width>>y),T=Math.max(1,p.height>>y);if(w.width!==x||w.height!==T)break;const A=Ol(v);if(A&&(o||(o=A),A!==o))break;_++,c.push(v)}a=Math.min(a,_)}const l=Number.isFinite(a)?Math.max(1,a):1;return{subresources:c.filter(u=>u.mipLevel<l),mipLevels:l,format:o,hasExplicitMipChain:s}}function Ol(n){if(n.type==="texture-data")return n.textureFormat??Ud(n.data)}function Fl(n,e){switch(e.type){case"external-image":return n.getExternalImageSize(e.image);case"texture-data":return{width:e.data.width,height:e.data.height};default:throw new Error("Unsupported texture subresource")}}function TT(n,e,t,r){const{blockWidth:i=1,blockHeight:s=1}=n.getTextureFormatInfo(r);let o=1;for(let a=1;;a++){const c=Math.max(1,e>>a),l=Math.max(1,t>>a);if(c<i||l<s)break;o++}return o}async function zo(n){if(n=await n,Array.isArray(n))return await Promise.all(n.map(zo));if(n&&typeof n=="object"&&n.constructor===Object){const e=n,t=await Promise.all(Object.values(e).map(zo)),r=Object.keys(e),i={};for(let s=0;s<r.length;s++)i[r[s]]=t[s];return i}return n}function Is(n,e){if(!n)throw new Error(e)}class Wo{constructor(e={}){f(this,"id");f(this,"matrix",new $);f(this,"display",!0);f(this,"position",new Ge);f(this,"rotation",new Ge);f(this,"scale",new Ge(1,1,1));f(this,"userData",{});f(this,"props",{});const{id:t}=e;this.id=t||tt(this.constructor.name),this._setScenegraphNodeProps(e)}getBounds(){return null}destroy(){}delete(){this.destroy()}setProps(e){return this._setScenegraphNodeProps(e),this}toString(){return`{type: ScenegraphNode, id: ${this.id})}`}setPosition(e){return Is(e.length===3,"setPosition requires vector argument"),this.position=e,this}setRotation(e){return Is(e.length===3||e.length===4,"setRotation requires vector argument"),this.rotation=e,this}setScale(e){return Is(e.length===3,"setScale requires vector argument"),this.scale=e,this}setMatrix(e,t=!0){t?this.matrix.copy(e):this.matrix=e}setMatrixComponents(e){const{position:t,rotation:r,scale:i,update:s=!0}=e;return t&&this.setPosition(t),r&&this.setRotation(r),i&&this.setScale(i),s&&this.updateMatrix(),this}updateMatrix(){if(this.matrix.identity(),this.matrix.translate(this.position),this.rotation.length===4){const e=new $().fromQuaternion(this.rotation);this.matrix.multiplyRight(e)}else this.matrix.rotateXYZ(this.rotation);return this.matrix.scale(this.scale),this}update({position:e,rotation:t,scale:r}={}){return e&&this.setPosition(e),t&&this.setRotation(t),r&&this.setScale(r),this.updateMatrix(),this}getCoordinateUniforms(e,t){t=t||this.matrix;const r=new $(e).multiplyRight(t),i=r.invert(),s=i.transpose();return{viewMatrix:e,modelMatrix:t,objectMatrix:t,worldMatrix:r,worldInverseMatrix:i,worldInverseTransposeMatrix:s}}_setScenegraphNodeProps(e){e.display!==void 0&&(this.display=e.display),e!=null&&e.position&&this.setPosition(e.position),e!=null&&e.rotation&&this.setRotation(e.rotation),e!=null&&e.scale&&this.setScale(e.scale),this.updateMatrix(),e!=null&&e.matrix&&this.setMatrix(e.matrix),Object.assign(this.props,e)}}function Wd(){return[[1/0,1/0,1/0],[-1/0,-1/0,-1/0]]}function Hd(n,e,t){const r=new $(t);for(let i=0;i<8;i++){const s=new Ge(e[i&1?1:0][0],e[i&2?1:0][1],e[i&4?1:0][2]);r.transformAsPoint(s,s);for(let o=0;o<3;o++)n[0][o]=Math.min(n[0][o],s[o]),n[1][o]=Math.max(n[1][o],s[o])}}function jd(n){return Number.isFinite(n[0][0])}class Re extends Wo{constructor(t={}){t=Array.isArray(t)?{children:t}:t;const{children:r=[]}=t;S.assert(r.every(i=>i instanceof Wo),"every child must an instance of ScenegraphNode");super(t);f(this,"children");this.children=r}getBounds(){const t=Wd();return this.traverse((r,{worldMatrix:i})=>{const s=r.getBounds();if(!s)return;const o=new $(i).multiplyRight(r.matrix);Hd(t,s,o)}),jd(t)?t:null}destroy(){this.children.forEach(t=>t.destroy()),this.removeAll(),super.destroy()}add(...t){for(const r of t)Array.isArray(r)?this.add(...r):this.children.push(r);return this}remove(t){const r=this.children,i=r.indexOf(t);return i>-1&&r.splice(i,1),this}removeAll(){return this.children=[],this}traverse(t,{worldMatrix:r=new $}={}){if(!this.display)return;const i=new $(r).multiplyRight(this.matrix);for(const s of this.children)s.display&&(s instanceof Re?s.traverse(t,{worldMatrix:i}):t(s,{worldMatrix:i}))}traverseDepthSorted(t,{viewMatrix:r,worldMatrix:i=new $,order:s="back-to-front"}){const o=new $(r),a=[];this.traverse((l,u)=>{const d=l.getBounds(),h=d?new Ge(d[0]).add(d[1]).divide([2,2,2]):new Ge,m=new $(u.worldMatrix).multiplyRight(l.matrix);m.transformAsPoint(h,h),o.transformAsPoint(h,h),a.push({node:l,context:{worldMatrix:m,bounds:d,depth:-h[2]},index:a.length})},{worldMatrix:new $(i)});const c=s==="back-to-front"?-1:1;a.sort((l,u)=>c*(l.context.depth-u.context.depth)||l.index-u.index);for(const{node:l,context:u}of a)t(l,u)}preorderTraversal(t,{worldMatrix:r=new $}={}){const i=new $(r).multiplyRight(this.matrix);t(this,{worldMatrix:i});for(const s of this.children)s instanceof Re?s.preorderTraversal(t,{worldMatrix:i}):t(s,{worldMatrix:i})}}class Jn extends Wo{constructor(t){super(t);f(this,"model");f(this,"instanceMatrices");f(this,"bounds",null);f(this,"managedResources");this.model=t.model,this.managedResources=t.managedResources||[],this.instanceMatrices=t.instanceMatrices||null,this.bounds=t.bounds?this.instanceMatrices?ET(t.bounds,this.instanceMatrices):t.bounds:null,this.setProps(t)}destroy(){this.model&&(this.model.destroy(),this.model=null),this.managedResources.forEach(t=>t.destroy()),this.managedResources=[]}getBounds(){return this.bounds}draw(t){return this.model.draw(t)}}function ET(n,e){const t=Wd();for(const r of e)Hd(t,n,r);return jd(t)?t:null}const Ms=2,AT=1e4,Ii=class Ii{constructor(e,t){f(this,"device");f(this,"id");f(this,"pipelineFactory");f(this,"shaderFactory");f(this,"userData",{});f(this,"bindings",{});f(this,"pipeline");f(this,"source");f(this,"shader");f(this,"shaderInputs");f(this,"_uniformStore");f(this,"_pipelineNeedsUpdate","newly created");f(this,"_getModuleUniforms");f(this,"props");f(this,"_destroyed",!1);f(this,"_lastLogTime",0);f(this,"_logOpen",!1);f(this,"_drawCount",0);var p,g;if(e.type!=="webgpu")throw new Error("Computation is only supported in WebGPU");this.props={...Ii.defaultProps,...t},t=this.props,this.id=t.id||tt("model"),this.device=e,Object.assign(this.userData,t.userData);const r=RT(e),i=Wf(this.props.plugins,r.shaderLanguage);if(Object.keys(i.vertexInputs).length>0||Object.keys(i.varyings).length>0)throw new Error("Computation does not support ShaderPlugin vertex inputs or varyings");const s=Hf(this.props.modules,i.modules),o=Object.fromEntries(s.map(b=>[b.name,b]));this.shaderInputs=t.shaderInputs||new ki(o),t.shaderInputs&&i.modules.length>0&&this.shaderInputs.addModules(i.modules),this.setShaderInputs(this.shaderInputs);const a=Cd(this.props.modules,(p=this.shaderInputs)==null?void 0:p.getModules()),c={...i.defines,...this.props.defines};this.props.shaderLayout=si(this.props.shaderLayout,a)||null,this.pipelineFactory=t.pipelineFactory||Zr.getDefaultPipelineFactory(this.device),this.shaderFactory=t.shaderFactory||Jr.getDefaultShaderFactory(this.device);const l=this.props.shaderAssembler;Fn(l instanceof zt);const{source:u,getUniforms:d,shaderLayout:h}=l.assembleWGSLShader({platformInfo:r,...this.props,modules:a,defines:c,scanVertexAttributes:!1,pluginInjections:i.injections});this.source=u,this._getModuleUniforms=d;const m=h??((g=e.getShaderLayout)==null?void 0:g.call(e,this.source,{scanVertexAttributes:!1}));this.props.shaderLayout=si(this.props.shaderLayout||m||null,a)||null,this.pipeline=this._updatePipeline(),t.bindings&&this.setBindings(t.bindings)}destroy(){this._destroyed||(this.pipelineFactory.release(this.pipeline),this.shaderFactory.release(this.shader),this._uniformStore.destroy(),this._destroyed=!0)}predraw(e){this.updateShaderInputs(e)}dispatch(e,t,r,i){try{this._logDrawCallStart(),this._setPipeline(e),e.dispatch(t,r,i)}finally{this._logDrawCallEnd()}}dispatchIndirect(e,t,r=0){try{this._logDrawCallStart(),this._setPipeline(e),e.dispatchIndirect(t,r)}finally{this._logDrawCallEnd()}}_setPipeline(e){this.pipeline=this._updatePipeline(),this.pipeline.setBindings(this.bindings),e.setPipeline(this.pipeline),e.setBindings({})}setVertexCount(e){}setInstanceCount(e){}setShaderInputs(e){this.shaderInputs=e,this._uniformStore=new Sa(this.device,this.shaderInputs.modules);for(const[t,r]of Object.entries(this.shaderInputs.modules))if(Di(r)){const i=this._uniformStore.getManagedUniformBuffer(t);this.bindings[`${t}Uniforms`]=i}}setShaderModuleProps(e){const t=this._getModuleUniforms(e),r=Object.keys(t).filter(i=>{const s=t[i];return!ff(s)&&typeof s!="number"&&typeof s!="boolean"});for(const i of r)t[i],delete t[i]}updateShaderInputs(e){this._uniformStore.setUniforms(this.shaderInputs.getUniformValues(),e)}setBindings(e){Object.assign(this.bindings,e)}_setPipelineNeedsUpdate(e){this._pipelineNeedsUpdate=this._pipelineNeedsUpdate||e}_updatePipeline(){if(this._pipelineNeedsUpdate){let e=null;this.pipeline&&(S.log(1,`Model ${this.id}: Recreating pipeline because "${this._pipelineNeedsUpdate}".`)(),e=this.shader),this._pipelineNeedsUpdate=!1,this.shader=this.shaderFactory.createShader({id:`${this.id}-fragment`,stage:"compute",source:this.source,debugShaders:this.props.debugShaders}),this.pipeline=this.pipelineFactory.createComputePipeline({...this.props,shader:this.shader}),e&&this.shaderFactory.release(e)}return this.pipeline}_logDrawCallStart(){const e=S.level>3?0:AT;S.level<2||Date.now()-this._lastLogTime<e||(this._lastLogTime=Date.now(),this._logOpen=!0,S.group(Ms,`>>> DRAWING MODEL ${this.id}`,{collapsed:S.level<=2})())}_logDrawCallEnd(){if(this._logOpen){const e=this.shaderInputs.getDebugTable();S.table(Ms,e)(),S.groupEnd(Ms)(),this._logOpen=!1}}_getBufferOrConstantValues(e,t){const r=Ze.getTypedArrayConstructor(t);return(e instanceof F?new r(e.debugData):e).toString()}};f(Ii,"defaultProps",{...Un.defaultProps,id:"unnamed",handle:void 0,userData:{},source:"",modules:[],defines:{},plugins:[],bindings:void 0,shaderInputs:void 0,pipelineFactory:void 0,shaderFactory:void 0,shaderAssembler:mt.getDefaultShaderAssembler("wgsl"),debugShaders:void 0});let gt=Ii;function RT(n){return{type:n.type,shaderLanguage:n.info.shadingLanguage,shaderLanguageVersion:n.info.shadingLanguageVersion,gpu:n.info.gpu,limits:n.limits,features:n.features}}const IT={WEBGL_depth_texture:{UNSIGNED_INT_24_8_WEBGL:34042},OES_element_index_uint:{},OES_texture_float:{},OES_texture_half_float:{HALF_FLOAT_OES:5131},EXT_color_buffer_float:{},OES_standard_derivatives:{FRAGMENT_SHADER_DERIVATIVE_HINT_OES:35723},EXT_frag_depth:{},EXT_blend_minmax:{MIN_EXT:32775,MAX_EXT:32776},EXT_shader_texture_lod:{}},MT=n=>({drawBuffersWEBGL(e){return n.drawBuffers(e)},COLOR_ATTACHMENT0_WEBGL:36064,COLOR_ATTACHMENT1_WEBGL:36065,COLOR_ATTACHMENT2_WEBGL:36066,COLOR_ATTACHMENT3_WEBGL:36067}),LT=n=>({VERTEX_ARRAY_BINDING_OES:34229,createVertexArrayOES(){return n.createVertexArray()},deleteVertexArrayOES(e){return n.deleteVertexArray(e)},isVertexArrayOES(e){return n.isVertexArray(e)},bindVertexArrayOES(e){return n.bindVertexArray(e)}}),CT=n=>({VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE:35070,drawArraysInstancedANGLE(...e){return n.drawArraysInstanced(...e)},drawElementsInstancedANGLE(...e){return n.drawElementsInstanced(...e)},vertexAttribDivisorANGLE(...e){return n.vertexAttribDivisor(...e)}});function PT(n=!0){const e=HTMLCanvasElement.prototype;if(!n&&e.originalGetContext){e.getContext=e.originalGetContext,e.originalGetContext=void 0;return}e.originalGetContext=e.getContext,e.getContext=function(t,r){if(t==="webgl"||t==="experimental-webgl"){const i=this.originalGetContext("webgl2",r);return i instanceof HTMLElement&&BT(i),i}return this.originalGetContext(t,r)}}function BT(n){n.getExtension("EXT_color_buffer_float");const e={...IT,WEBGL_disjoint_timer_query:n.getExtension("EXT_disjoint_timer_query_webgl2"),WEBGL_draw_buffers:MT(n),OES_vertex_array_object:LT(n),ANGLE_instanced_arrays:CT(n)},t=n.getExtension.bind(n);n.getExtension=function(i){const s=t(i);return s||(i in e?e[i]:null)};const r=n.getSupportedExtensions;n.getSupportedExtensions=function(){const i=r.apply(n)||[];return i==null?void 0:i.concat(Object.keys(e))}}let Ul=!1;async function NT(){{Ga();return}}function OT(n,e){return Ga(),n}async function FT(n){{Ga();return}}function UT(n){return null}function Ga(){Ul||(Ul=!0,S.warn("Import @luma.gl/webgl/debug before enabling WebGL debugging.")())}const cn=1;class DT extends Ab{constructor(){super(...arguments);f(this,"type","webgl")}enforceWebGL2(t){PT(t)}isSupported(){return typeof WebGL2RenderingContext<"u"}isDeviceHandle(t){return typeof WebGL2RenderingContext<"u"&&t instanceof WebGL2RenderingContext?!0:(typeof WebGLRenderingContext<"u"&&t instanceof WebGLRenderingContext&&S.warn("WebGL1 is not supported",t)(),!1)}async attach(t,r={}){const{WebGLDevice:i}=await Bn(async()=>{const{WebGLDevice:a}=await Promise.resolve().then(()=>eu);return{WebGLDevice:a}},void 0);if(t instanceof i)return t;const s=i.getDeviceFromContext(t);if(s)return s;if(!kT(t))throw new Error("Invalid WebGL2RenderingContext");r=Dl(r),await kl(r);const o=r.createCanvasContext===!0?{}:r.createCanvasContext;return new i({...r,_handle:t,createCanvasContext:{canvas:t.canvas,autoResize:!1,...o}})}async create(t={}){const{WebGLDevice:r}=await Bn(async()=>{const{WebGLDevice:i}=await Promise.resolve().then(()=>eu);return{WebGLDevice:i}},void 0);t=Dl(t),await kl(t);try{const i=new r(t);S.groupCollapsed(cn,`WebGLDevice ${i.id} created`)();const s=`${i._reused?"Reusing":"Created"} device with WebGL2 ${i.props.debug?"debug ":""}context: ${i.info.vendor}, ${i.info.renderer} for canvas: ${i.canvasContext.id}`;return S.probe(cn,s)(),S.table(cn,i.info)(),i}finally{S.groupEnd(cn)(),S.info(cn,"%cWebGL call tracing: luma.log.set('debug-webgl') ","color: white; background: blue; padding: 2px 6px; border-radius: 3px;")()}}}function kT(n){return typeof WebGL2RenderingContext<"u"&&n instanceof WebGL2RenderingContext?!0:!!(n&&typeof n.createVertexArray=="function")}const SP=new DT;function Dl(n){return{...n,debug:n.debug??Dt.defaultProps.debug,debugWebGL:n.debugWebGL??Dt.defaultProps.debugWebGL,debugSpectorJS:n.debugSpectorJS??!!S.get("debug-spectorjs")}}async function kl(n){const e=[];(n.debugWebGL||n.debug)&&e.push(NT()),n.debugSpectorJS&&e.push(FT());const t=await Promise.allSettled(e);for(const r of t)r.status==="rejected"&&S.error(`Failed to initialize debug libraries ${r.reason}`)()}const za={3042:!1,32773:new Float32Array([0,0,0,0]),32777:32774,34877:32774,32969:1,32968:0,32971:1,32970:0,3106:new Float32Array([0,0,0,0]),3107:[!0,!0,!0,!0],2884:!1,2885:1029,2929:!1,2931:1,2932:513,2928:new Float32Array([0,1]),2930:!0,3024:!0,35725:null,36006:null,36007:null,34229:null,34964:null,2886:2305,33170:4352,2849:1,32823:!1,32824:0,10752:0,32926:!1,32928:!1,32938:1,32939:!1,3089:!1,3088:new Int32Array([0,0,1024,1024]),2960:!1,2961:0,2968:4294967295,36005:4294967295,2962:519,2967:0,2963:4294967295,34816:519,36003:0,36004:4294967295,2964:7680,2965:7680,2966:7680,34817:7680,34818:7680,34819:7680,2978:[0,0,1024,1024],36389:null,36662:null,36663:null,35053:null,35055:null,35723:4352,36010:null,35977:!1,3333:4,3317:4,37440:!1,37441:!1,37443:37444,3330:0,3332:0,3331:0,3314:0,32878:0,3316:0,3315:0,32877:0},Y=(n,e,t)=>e?n.enable(t):n.disable(t),$l=(n,e,t)=>n.hint(t,e),he=(n,e,t)=>n.pixelStorei(t,e),Vl=(n,e,t)=>{const r=t===36006?36009:36008;return n.bindFramebuffer(r,e)},ln=(n,e,t)=>{const i={34964:34962,36662:36662,36663:36663,35053:35051,35055:35052}[t];n.bindBuffer(i,e)};function Ls(n){return Array.isArray(n)||ArrayBuffer.isView(n)&&!(n instanceof DataView)}const $T={3042:Y,32773:(n,e)=>n.blendColor(...e),32777:"blendEquation",34877:"blendEquation",32969:"blendFunc",32968:"blendFunc",32971:"blendFunc",32970:"blendFunc",3106:(n,e)=>n.clearColor(...e),3107:(n,e)=>n.colorMask(...e),2884:Y,2885:(n,e)=>n.cullFace(e),2929:Y,2931:(n,e)=>n.clearDepth(e),2932:(n,e)=>n.depthFunc(e),2928:(n,e)=>n.depthRange(...e),2930:(n,e)=>n.depthMask(e),3024:Y,35723:$l,35725:(n,e)=>n.useProgram(e),36007:(n,e)=>n.bindRenderbuffer(36161,e),36389:(n,e)=>{var t;return(t=n.bindTransformFeedback)==null?void 0:t.call(n,36386,e)},34229:(n,e)=>n.bindVertexArray(e),36006:Vl,36010:Vl,34964:ln,36662:ln,36663:ln,35053:ln,35055:ln,2886:(n,e)=>n.frontFace(e),33170:$l,2849:(n,e)=>n.lineWidth(e),32823:Y,32824:"polygonOffset",10752:"polygonOffset",35977:Y,32926:Y,32928:Y,32938:"sampleCoverage",32939:"sampleCoverage",3089:Y,3088:(n,e)=>n.scissor(...e),2960:Y,2961:(n,e)=>n.clearStencil(e),2968:(n,e)=>n.stencilMaskSeparate(1028,e),36005:(n,e)=>n.stencilMaskSeparate(1029,e),2962:"stencilFuncFront",2967:"stencilFuncFront",2963:"stencilFuncFront",34816:"stencilFuncBack",36003:"stencilFuncBack",36004:"stencilFuncBack",2964:"stencilOpFront",2965:"stencilOpFront",2966:"stencilOpFront",34817:"stencilOpBack",34818:"stencilOpBack",34819:"stencilOpBack",2978:(n,e)=>n.viewport(...e),34383:Y,10754:Y,12288:Y,12289:Y,12290:Y,12291:Y,12292:Y,12293:Y,12294:Y,12295:Y,3333:he,3317:he,37440:he,37441:he,37443:he,3330:he,3332:he,3331:he,3314:he,32878:he,3316:he,3315:he,32877:he,framebuffer:(n,e)=>{const t=e&&"handle"in e?e.handle:e;return n.bindFramebuffer(36160,t)},blend:(n,e)=>e?n.enable(3042):n.disable(3042),blendColor:(n,e)=>n.blendColor(...e),blendEquation:(n,e)=>{const t=typeof e=="number"?[e,e]:e;n.blendEquationSeparate(...t)},blendFunc:(n,e)=>{const t=(e==null?void 0:e.length)===2?[...e,...e]:e;n.blendFuncSeparate(...t)},clearColor:(n,e)=>n.clearColor(...e),clearDepth:(n,e)=>n.clearDepth(e),clearStencil:(n,e)=>n.clearStencil(e),colorMask:(n,e)=>n.colorMask(...e),cull:(n,e)=>e?n.enable(2884):n.disable(2884),cullFace:(n,e)=>n.cullFace(e),depthTest:(n,e)=>e?n.enable(2929):n.disable(2929),depthFunc:(n,e)=>n.depthFunc(e),depthMask:(n,e)=>n.depthMask(e),depthRange:(n,e)=>n.depthRange(...e),dither:(n,e)=>e?n.enable(3024):n.disable(3024),derivativeHint:(n,e)=>{n.hint(35723,e)},frontFace:(n,e)=>n.frontFace(e),mipmapHint:(n,e)=>n.hint(33170,e),lineWidth:(n,e)=>n.lineWidth(e),polygonOffsetFill:(n,e)=>e?n.enable(32823):n.disable(32823),polygonOffset:(n,e)=>n.polygonOffset(...e),sampleCoverage:(n,e)=>n.sampleCoverage(e[0],e[1]||!1),scissorTest:(n,e)=>e?n.enable(3089):n.disable(3089),scissor:(n,e)=>n.scissor(...e),stencilTest:(n,e)=>e?n.enable(2960):n.disable(2960),stencilMask:(n,e)=>{e=Ls(e)?e:[e,e];const[t,r]=e;n.stencilMaskSeparate(1028,t),n.stencilMaskSeparate(1029,r)},stencilFunc:(n,e)=>{e=Ls(e)&&e.length===3?[...e,...e]:e;const[t,r,i,s,o,a]=e;n.stencilFuncSeparate(1028,t,r,i),n.stencilFuncSeparate(1029,s,o,a)},stencilOp:(n,e)=>{e=Ls(e)&&e.length===3?[...e,...e]:e;const[t,r,i,s,o,a]=e;n.stencilOpSeparate(1028,t,r,i),n.stencilOpSeparate(1029,s,o,a)},viewport:(n,e)=>n.viewport(...e)};function j(n,e,t){return e[n]!==void 0?e[n]:t[n]}const VT={blendEquation:(n,e,t)=>n.blendEquationSeparate(j(32777,e,t),j(34877,e,t)),blendFunc:(n,e,t)=>n.blendFuncSeparate(j(32969,e,t),j(32968,e,t),j(32971,e,t),j(32970,e,t)),polygonOffset:(n,e,t)=>n.polygonOffset(j(32824,e,t),j(10752,e,t)),sampleCoverage:(n,e,t)=>n.sampleCoverage(j(32938,e,t),j(32939,e,t)),stencilFuncFront:(n,e,t)=>n.stencilFuncSeparate(1028,j(2962,e,t),j(2967,e,t),j(2963,e,t)),stencilFuncBack:(n,e,t)=>n.stencilFuncSeparate(1029,j(34816,e,t),j(36003,e,t),j(36004,e,t)),stencilOpFront:(n,e,t)=>n.stencilOpSeparate(1028,j(2964,e,t),j(2965,e,t),j(2966,e,t)),stencilOpBack:(n,e,t)=>n.stencilOpSeparate(1029,j(34817,e,t),j(34818,e,t),j(34819,e,t))},Gl={enable:(n,e)=>n({[e]:!0}),disable:(n,e)=>n({[e]:!1}),pixelStorei:(n,e,t)=>n({[e]:t}),hint:(n,e,t)=>n({[e]:t}),useProgram:(n,e)=>n({35725:e}),bindRenderbuffer:(n,e,t)=>n({36007:t}),bindTransformFeedback:(n,e,t)=>n({36389:t}),bindVertexArray:(n,e)=>n({34229:e}),bindFramebuffer:(n,e,t)=>{switch(e){case 36160:return n({36006:t,36010:t});case 36009:return n({36006:t});case 36008:return n({36010:t});default:return null}},bindBuffer:(n,e,t)=>{const r={34962:[34964],36662:[36662],36663:[36663],35051:[35053],35052:[35055]}[e];return r?n({[r]:t}):{valueChanged:!0}},blendColor:(n,e,t,r,i)=>n({32773:new Float32Array([e,t,r,i])}),blendEquation:(n,e)=>n({32777:e,34877:e}),blendEquationSeparate:(n,e,t)=>n({32777:e,34877:t}),blendFunc:(n,e,t)=>n({32969:e,32968:t,32971:e,32970:t}),blendFuncSeparate:(n,e,t,r,i)=>n({32969:e,32968:t,32971:r,32970:i}),clearColor:(n,e,t,r,i)=>n({3106:new Float32Array([e,t,r,i])}),clearDepth:(n,e)=>n({2931:e}),clearStencil:(n,e)=>n({2961:e}),colorMask:(n,e,t,r,i)=>n({3107:[e,t,r,i]}),cullFace:(n,e)=>n({2885:e}),depthFunc:(n,e)=>n({2932:e}),depthRange:(n,e,t)=>n({2928:new Float32Array([e,t])}),depthMask:(n,e)=>n({2930:e}),frontFace:(n,e)=>n({2886:e}),lineWidth:(n,e)=>n({2849:e}),polygonOffset:(n,e,t)=>n({32824:e,10752:t}),sampleCoverage:(n,e,t)=>n({32938:e,32939:t}),scissor:(n,e,t,r,i)=>n({3088:new Int32Array([e,t,r,i])}),stencilMask:(n,e)=>n({2968:e,36005:e}),stencilMaskSeparate:(n,e,t)=>n({[e===1028?2968:36005]:t}),stencilFunc:(n,e,t,r)=>n({2962:e,2967:t,2963:r,34816:e,36003:t,36004:r}),stencilFuncSeparate:(n,e,t,r,i)=>n({[e===1028?2962:34816]:t,[e===1028?2967:36003]:r,[e===1028?2963:36004]:i}),stencilOp:(n,e,t,r)=>n({2964:e,2965:t,2966:r,34817:e,34818:t,34819:r}),stencilOpSeparate:(n,e,t,r,i)=>n({[e===1028?2964:34817]:t,[e===1028?2965:34818]:r,[e===1028?2966:34819]:i}),viewport:(n,e,t,r,i)=>n({2978:[e,t,r,i]})},Oe=(n,e)=>n.isEnabled(e),zl={3042:Oe,2884:Oe,2929:Oe,3024:Oe,32823:Oe,32926:Oe,32928:Oe,3089:Oe,2960:Oe,35977:Oe},GT=new Set([34016,36388,36387,35983,35368,34965,35739,35738,3074,34853,34854,34855,34856,34857,34858,34859,34860,34861,34862,34863,34864,34865,34866,34867,34868,35097,32873,35869,32874,34068]);function nn(n,e){var i;if(WT(e))return;const t={};for(const s in e){const o=Number(s),a=$T[s];a&&(typeof a=="string"?t[a]=!0:a(n,e[s],o))}const r=(i=n.lumaState)==null?void 0:i.cache;if(r)for(const s in t){const o=VT[s];o(n,e,r)}}function Xd(n,e=za){if(typeof e=="number"){const i=e,s=zl[i];return s?s(n,i):n.getParameter(i)}const t=Array.isArray(e)?e:Object.keys(e),r={};for(const i of t){const s=zl[i];r[i]=s?s(n,Number(i)):n.getParameter(Number(i))}return r}function zT(n){nn(n,za)}function WT(n){for(const e in n)return!1;return!0}function HT(n,e){if(n===e)return!0;if(Wl(n)&&Wl(e)&&n.length===e.length){for(let t=0;t<n.length;++t)if(n[t]!==e[t])return!1;return!0}return!1}function Wl(n){return Array.isArray(n)||ArrayBuffer.isView(n)}class ft{constructor(e,t){f(this,"gl");f(this,"program",null);f(this,"stateStack",[]);f(this,"enable",!0);f(this,"cache",null);f(this,"log");f(this,"initialized",!1);this.gl=e,this.log=(t==null?void 0:t.log)||(()=>{}),this._updateCache=this._updateCache.bind(this),Object.seal(this)}static get(e){return e.lumaState}push(e={}){this.stateStack.push({})}pop(){const e=this.stateStack[this.stateStack.length-1];nn(this.gl,e),this.stateStack.pop()}trackState(e,t){if(this.cache=t!=null&&t.copyState?Xd(e):Object.assign({},za),this.initialized)throw new Error("WebGLStateTracker");this.initialized=!0,this.gl.lumaState=this,XT(e);for(const r in Gl){const i=Gl[r];jT(e,r,i)}Hl(e,"getParameter"),Hl(e,"isEnabled")}_updateCache(e){let t=!1,r;const i=this.stateStack.length>0?this.stateStack[this.stateStack.length-1]:null;for(const s in e){const o=e[s],a=this.cache[s];HT(o,a)||(t=!0,r=a,i&&!(s in i)&&(i[s]=a),this.cache[s]=o)}return{valueChanged:t,oldValue:r}}}function Hl(n,e){const t=n[e].bind(n);n[e]=function(i){if(i===void 0||GT.has(i))return t(i);const s=ft.get(n);return i in s.cache||(s.cache[i]=t(i)),s.enable?s.cache[i]:t(i)},Object.defineProperty(n[e],"name",{value:`${e}-from-cache`,configurable:!1})}function jT(n,e,t){if(!n[e])return;const r=n[e].bind(n);n[e]=function(...s){const o=ft.get(n),{valueChanged:a,oldValue:c}=t(o._updateCache,...s);return a&&r(...s),c},Object.defineProperty(n[e],"name",{value:`${e}-to-cache`,configurable:!1})}function XT(n){const e=n.useProgram.bind(n);n.useProgram=function(r){const i=ft.get(n);i.program!==r&&(e(r),i.program=r)}}function Ho(n){const e=n.luma||{_polyfilled:!1,extensions:{},softwareRenderer:!1};return e._polyfilled??(e._polyfilled=!1),e.extensions||(e.extensions={}),n.luma=e,e}function KT(n,e,t){let r="";const i=c=>{const l=c.statusMessage;l&&(r||(r=l))};n.addEventListener("webglcontextcreationerror",i,!1);const s=t.failIfMajorPerformanceCaveat!==!0,o={preserveDrawingBuffer:!0,...t,failIfMajorPerformanceCaveat:!0};let a=null;try{a||(a=n.getContext("webgl2",o)),!a&&o.failIfMajorPerformanceCaveat&&(r||(r="Only software GPU is available. Set `failIfMajorPerformanceCaveat: false` to allow."));let c=!1;if(!a&&s&&(o.failIfMajorPerformanceCaveat=!1,a=n.getContext("webgl2",o),c=!0),a||(a=n.getContext("webgl",{}),a&&(a=null,r||(r="Your browser only supports WebGL1"))),!a)throw r||(r="Your browser does not support WebGL"),new Error(`Failed to create WebGL context: ${r}`);const l=Ho(a);l.softwareRenderer=c;const{onContextLost:u,onContextRestored:d}=e;return n.addEventListener("webglcontextlost",h=>u(h),!1),n.addEventListener("webglcontextrestored",h=>d(h),!1),a}finally{n.removeEventListener("webglcontextcreationerror",i,!1)}}function bt(n,e,t){return t[e]===void 0&&(t[e]=n.getExtension(e)||null),t[e]}function qT(n,e){const t=n.getParameter(7936),r=n.getParameter(7937);bt(n,"WEBGL_debug_renderer_info",e);const i=e.WEBGL_debug_renderer_info,s=n.getParameter(i?i.UNMASKED_VENDOR_WEBGL:7936),o=n.getParameter(i?i.UNMASKED_RENDERER_WEBGL:7937),a=s||t,c=o||r,l=n.getParameter(7938),u=Kd(a,c),d=YT(a,c),h=QT(a,c);return{type:"webgl",gpu:u,gpuType:h,gpuBackend:d,vendor:a,renderer:c,version:l,shadingLanguage:"glsl",shadingLanguageVersion:300}}function Kd(n,e){return/NVIDIA/i.exec(n)||/NVIDIA/i.exec(e)?"nvidia":/INTEL/i.exec(n)||/INTEL/i.exec(e)?"intel":/Apple/i.exec(n)||/Apple/i.exec(e)?"apple":/AMD/i.exec(n)||/AMD/i.exec(e)||/ATI/i.exec(n)||/ATI/i.exec(e)?"amd":/SwiftShader/i.exec(n)||/SwiftShader/i.exec(e)?"software":"unknown"}function YT(n,e){return/Metal/i.exec(n)||/Metal/i.exec(e)?"metal":/ANGLE/i.exec(n)||/ANGLE/i.exec(e)?"opengl":"unknown"}function QT(n,e){if(/SwiftShader/i.exec(n)||/SwiftShader/i.exec(e))return"cpu";switch(Kd(n,e)){case"apple":return ZT(n,e)?"integrated":"unknown";case"intel":return"integrated";case"software":return"cpu";case"unknown":return"unknown";default:return"discrete"}}function ZT(n,e){return/Apple (M\d|A\d|GPU)/i.test(`${n} ${e}`)}function qd(n){switch(n){case"uint8":return 5121;case"sint8":return 5120;case"unorm8":return 5121;case"snorm8":return 5120;case"uint16":return 5123;case"sint16":return 5122;case"unorm16":return 5123;case"snorm16":return 5122;case"uint32":return 5125;case"sint32":return 5124;case"float16":return 5131;case"float32":return 5126}throw new Error(String(n))}const mn="WEBGL_compressed_texture_s3tc",pn="WEBGL_compressed_texture_s3tc_srgb",Ct="EXT_texture_compression_rgtc",Pt="EXT_texture_compression_bptc",JT="WEBGL_compressed_texture_etc",eE="WEBGL_compressed_texture_astc",tE="WEBGL_compressed_texture_etc1",nE="WEBGL_compressed_texture_pvrtc",rE="WEBGL_compressed_texture_atc",iE="EXT_texture_norm16",jl="EXT_render_snorm",Yd="EXT_color_buffer_float",Cs="snorm8-renderable-webgl",Ps="norm16-renderable-webgl",Bs="snorm16-renderable-webgl",Ns="float16-renderable-webgl",Er="float32-renderable-webgl",sE="rgb9e5ufloat-renderable-webgl",Wa={"float32-renderable-webgl":{extensions:[Yd]},"float16-renderable-webgl":{extensions:["EXT_color_buffer_half_float"]},"rgb9e5ufloat-renderable-webgl":{extensions:["WEBGL_render_shared_exponent"]},"snorm8-renderable-webgl":{extensions:[jl]},"norm16-webgl":{extensions:[iE]},"norm16-renderable-webgl":{features:["norm16-webgl"]},"snorm16-renderable-webgl":{features:["norm16-webgl"],extensions:[jl]},"float32-filterable":{extensions:["OES_texture_float_linear"]},"float16-filterable-webgl":{extensions:["OES_texture_half_float_linear"]},"texture-filterable-anisotropic-webgl":{extensions:["EXT_texture_filter_anisotropic"]},"texture-blend-float-webgl":{extensions:["EXT_float_blend"]},"texture-compression-bc":{extensions:[mn,pn,Ct,Pt]},"texture-compression-bc5-webgl":{extensions:[Ct]},"texture-compression-bc7-webgl":{extensions:[Pt]},"texture-compression-etc2":{extensions:[JT]},"texture-compression-astc":{extensions:[eE]},"texture-compression-etc1-webgl":{extensions:[tE]},"texture-compression-pvrtc-webgl":{extensions:[nE]},"texture-compression-atc-webgl":{extensions:[rE]}};function oE(n){return n in Wa}function Qd(n,e,t){return Zd(n,e,t,new Set)}function Zd(n,e,t,r){const i=Wa[e];if(!i||r.has(e))return!1;r.add(e);const s=(i.features||[]).every(o=>Zd(n,o,t,r));return r.delete(e),s?(i.extensions||[]).every(o=>!!bt(n,o,t)):!1}const $i={r8unorm:{gl:33321,rb:!0},r8snorm:{gl:36756,r:Cs},r8uint:{gl:33330,rb:!0},r8sint:{gl:33329,rb:!0},rg8unorm:{gl:33323,rb:!0},rg8snorm:{gl:36757,r:Cs},rg8uint:{gl:33336,rb:!0},rg8sint:{gl:33335,rb:!0},r16uint:{gl:33332,rb:!0},r16sint:{gl:33331,rb:!0},r16float:{gl:33325,rb:!0,r:Ns},r16unorm:{gl:33322,rb:!0,r:Ps},r16snorm:{gl:36760,r:Bs},"rgba4unorm-webgl":{gl:32854,rb:!0},"rgb565unorm-webgl":{gl:36194,rb:!0},"rgb5a1unorm-webgl":{gl:32855,rb:!0},"rgb8unorm-webgl":{gl:32849},"rgb8snorm-webgl":{gl:36758},rgba8unorm:{gl:32856},"rgba8unorm-srgb":{gl:35907},rgba8snorm:{gl:36759,r:Cs},rgba8uint:{gl:36220},rgba8sint:{gl:36238},bgra8unorm:{},"bgra8unorm-srgb":{},rg16uint:{gl:33338},rg16sint:{gl:33337},rg16float:{gl:33327,rb:!0,r:Ns},rg16unorm:{gl:33324,r:Ps},rg16snorm:{gl:36761,r:Bs},r32uint:{gl:33334,rb:!0},r32sint:{gl:33333,rb:!0},r32float:{gl:33326,r:Er},rgb9e5ufloat:{gl:35901,r:sE},rg11b10ufloat:{gl:35898,rb:!0},rgb10a2unorm:{gl:32857,rb:!0},rgb10a2uint:{gl:36975,rb:!0},"rgb16unorm-webgl":{gl:32852,r:!1},"rgb16snorm-webgl":{gl:36762,r:!1},rg32uint:{gl:33340,rb:!0},rg32sint:{gl:33339,rb:!0},rg32float:{gl:33328,rb:!0,r:Er},rgba16uint:{gl:36214,rb:!0},rgba16sint:{gl:36232,rb:!0},rgba16float:{gl:34842,r:Ns},rgba16unorm:{gl:32859,rb:!0,r:Ps},rgba16snorm:{gl:36763,r:Bs},"rgb32float-webgl":{gl:34837,x:Yd,r:Er,dataFormat:6407,types:[5126]},rgba32uint:{gl:36208,rb:!0},rgba32sint:{gl:36226,rb:!0},rgba32float:{gl:34836,rb:!0,r:Er},stencil8:{gl:36168,rb:!0},depth16unorm:{gl:33189,dataFormat:6402,types:[5123],rb:!0},depth24plus:{gl:33190,dataFormat:6402,types:[5125]},depth32float:{gl:36012,dataFormat:6402,types:[5126],rb:!0},"depth24plus-stencil8":{gl:35056,rb:!0,depthTexture:!0,dataFormat:34041,types:[34042]},"depth32float-stencil8":{gl:36013,dataFormat:34041,types:[36269],rb:!0},"bc1-rgb-unorm-webgl":{gl:33776,x:mn},"bc1-rgb-unorm-srgb-webgl":{gl:35916,x:pn},"bc1-rgba-unorm":{gl:33777,x:mn},"bc1-rgba-unorm-srgb":{gl:35916,x:pn},"bc2-rgba-unorm":{gl:33778,x:mn},"bc2-rgba-unorm-srgb":{gl:35918,x:pn},"bc3-rgba-unorm":{gl:33779,x:mn},"bc3-rgba-unorm-srgb":{gl:35919,x:pn},"bc4-r-unorm":{gl:36283,x:Ct},"bc4-r-snorm":{gl:36284,x:Ct},"bc5-rg-unorm":{gl:36285,x:Ct},"bc5-rg-snorm":{gl:36286,x:Ct},"bc6h-rgb-ufloat":{gl:36495,x:Pt},"bc6h-rgb-float":{gl:36494,x:Pt},"bc7-rgba-unorm":{gl:36492,x:Pt},"bc7-rgba-unorm-srgb":{gl:36493,x:Pt},"etc2-rgb8unorm":{gl:37492},"etc2-rgb8unorm-srgb":{gl:37494},"etc2-rgb8a1unorm":{gl:37496},"etc2-rgb8a1unorm-srgb":{gl:37497},"etc2-rgba8unorm":{gl:37493},"etc2-rgba8unorm-srgb":{gl:37495},"eac-r11unorm":{gl:37488},"eac-r11snorm":{gl:37489},"eac-rg11unorm":{gl:37490},"eac-rg11snorm":{gl:37491},"astc-4x4-unorm":{gl:37808},"astc-4x4-unorm-srgb":{gl:37840},"astc-5x4-unorm":{gl:37809},"astc-5x4-unorm-srgb":{gl:37841},"astc-5x5-unorm":{gl:37810},"astc-5x5-unorm-srgb":{gl:37842},"astc-6x5-unorm":{gl:37811},"astc-6x5-unorm-srgb":{gl:37843},"astc-6x6-unorm":{gl:37812},"astc-6x6-unorm-srgb":{gl:37844},"astc-8x5-unorm":{gl:37813},"astc-8x5-unorm-srgb":{gl:37845},"astc-8x6-unorm":{gl:37814},"astc-8x6-unorm-srgb":{gl:37846},"astc-8x8-unorm":{gl:37815},"astc-8x8-unorm-srgb":{gl:37847},"astc-10x5-unorm":{gl:37816},"astc-10x5-unorm-srgb":{gl:37848},"astc-10x6-unorm":{gl:37817},"astc-10x6-unorm-srgb":{gl:37849},"astc-10x8-unorm":{gl:37818},"astc-10x8-unorm-srgb":{gl:37850},"astc-10x10-unorm":{gl:37819},"astc-10x10-unorm-srgb":{gl:37851},"astc-12x10-unorm":{gl:37820},"astc-12x10-unorm-srgb":{gl:37852},"astc-12x12-unorm":{gl:37821},"astc-12x12-unorm-srgb":{gl:37853},"pvrtc-rgb4unorm-webgl":{gl:35840},"pvrtc-rgba4unorm-webgl":{gl:35842},"pvrtc-rgb2unorm-webgl":{gl:35841},"pvrtc-rgba2unorm-webgl":{gl:35843},"etc1-rbg-unorm-webgl":{gl:36196},"atc-rgb-unorm-webgl":{gl:35986},"atc-rgba-unorm-webgl":{gl:35986},"atc-rgbai-unorm-webgl":{gl:34798}};function aE(n,e,t){let r=e.create;const i=$i[e.format];(i==null?void 0:i.gl)===void 0&&(r=!1),i!=null&&i.x&&(r=r&&!!bt(n,i.x,t)),e.format==="stencil8"&&(r=!1);const s=(i==null?void 0:i.r)===!1?!1:(i==null?void 0:i.r)===void 0||Qd(n,i.r,t),o=r&&e.render&&s&&cE(n,e.format,t);return{format:e.format,create:r&&e.create,render:o,filter:r&&e.filter,blend:r&&e.blend,store:r&&e.store}}function cE(n,e,t){const r=$i[e],i=r==null?void 0:r.gl;if(i===void 0||r!=null&&r.x&&!bt(n,r.x,t))return!1;const s=n.getParameter(32873),o=n.getParameter(36006),a=n.createTexture(),c=n.createFramebuffer();if(!a||!c)return!1;const l=0;let u=Number(n.getError());for(;u!==l;)u=n.getError();let d=!1;try{if(n.bindTexture(3553,a),n.texStorage2D(3553,1,i,1,1),Number(n.getError())!==l)return!1;n.bindFramebuffer(36160,c),n.framebufferTexture2D(36160,36064,3553,a,0),d=Number(n.checkFramebufferStatus(36160))===36053&&Number(n.getError())===l}finally{n.bindFramebuffer(36160,o),n.deleteFramebuffer(c),n.bindTexture(3553,s),n.deleteTexture(a)}return d}function Jd(n){var i;const e=$i[n],t=fE(n),r=xe.getInfo(n);return r.compressed&&(e.dataFormat=t),{internalFormat:t,format:(e==null?void 0:e.dataFormat)||uE(r.channels,r.integer,r.normalized,t),type:r.dataType?qd(r.dataType):((i=e==null?void 0:e.types)==null?void 0:i[0])||5121,compressed:r.compressed||!1}}function lE(n){switch(xe.getInfo(n).attachment){case"depth":return 36096;case"stencil":return 36128;case"depth-stencil":return 33306;default:throw new Error(`Not a depth stencil format: ${n}`)}}function uE(n,e,t,r){if(r===6408||r===6407)return r;switch(n){case"r":return e&&!t?36244:6403;case"rg":return e&&!t?33320:33319;case"rgb":return e&&!t?36248:6407;case"rgba":return e&&!t?36249:6408;case"bgra":throw new Error("bgra pixels not supported by WebGL");default:return 6408}}function fE(n){const e=$i[n],t=e==null?void 0:e.gl;if(t===void 0)throw new Error(`Unsupported texture format ${n}`);return t}const Xl={"depth-clip-control":"EXT_depth_clamp","timestamp-query":"EXT_disjoint_timer_query_webgl2","compilation-status-async-webgl":"KHR_parallel_shader_compile","html-in-canvas":n=>v_()&&typeof n.texElementImage2D=="function","polygon-mode-webgl":"WEBGL_polygon_mode","provoking-vertex-webgl":"WEBGL_provoking_vertex","shader-clip-cull-distance-webgl":"WEBGL_clip_cull_distance","shader-noperspective-interpolation-webgl":"NV_shader_noperspective_interpolation","shader-conservative-depth-webgl":"EXT_conservative_depth"};class dE extends y_{constructor(t,r,i){super([],i);f(this,"gl");f(this,"extensions");f(this,"testedFeatures",new Set);this.gl=t,this.extensions=r,bt(t,"EXT_color_buffer_float",r)}*[Symbol.iterator](){const t=this.getFeatures();for(const r of t)this.has(r)&&(yield r);return[]}has(t){var r;return(r=this.disabledFeatures)!=null&&r[t]?!1:(this.testedFeatures.has(t)||(this.testedFeatures.add(t),oE(t)&&Qd(this.gl,t,this.extensions)&&this.features.add(t),this.getWebGLFeature(t)&&this.features.add(t)),this.features.has(t))}initializeFeatures(){const t=this.getFeatures().filter(r=>r!=="polygon-mode-webgl");for(const r of t)this.has(r)}getFeatures(){return[...Object.keys(Xl),...Object.keys(Wa)]}getWebGLFeature(t){const r=Xl[t];return typeof r=="string"?!!bt(this.gl,r,this.extensions):typeof r=="function"?r(this.gl):!!r}}class hE extends m_{constructor(t){super();f(this,"gl");f(this,"limits",{});this.gl=t}get maxTextureDimension1D(){return 0}get maxTextureDimension2D(){return this.getParameter(3379)}get maxTextureDimension3D(){return this.getParameter(32883)}get maxTextureArrayLayers(){return this.getParameter(35071)}get maxBindGroups(){return 0}get maxBindGroupsPlusVertexBuffers(){return 0}get maxBindingsPerBindGroup(){return 0}get maxDynamicUniformBuffersPerPipelineLayout(){return 0}get maxDynamicStorageBuffersPerPipelineLayout(){return 0}get maxSampledTexturesPerShaderStage(){return this.getParameter(35660)}get maxSamplersPerShaderStage(){return this.getParameter(35661)}get maxStorageBuffersPerShaderStage(){return 0}get maxStorageBuffersInVertexStage(){return 0}get maxStorageBuffersInFragmentStage(){return 0}get maxStorageTexturesPerShaderStage(){return 0}get maxStorageTexturesInVertexStage(){return 0}get maxStorageTexturesInFragmentStage(){return 0}get maxUniformBuffersPerShaderStage(){return this.getParameter(35375)}get maxUniformBufferBindingSize(){return this.getParameter(35376)}get maxStorageBufferBindingSize(){return 0}get maxBufferSize(){return Number.MAX_SAFE_INTEGER}get minUniformBufferOffsetAlignment(){return this.getParameter(35380)}get minStorageBufferOffsetAlignment(){return 0}get maxVertexBuffers(){return 16}get maxVertexAttributes(){return this.getParameter(34921)}get maxVertexBufferArrayStride(){return 2048}get maxInterStageShaderVariables(){return this.getParameter(35659)}get maxColorAttachments(){return this.getParameter(36063)}get maxColorAttachmentBytesPerSample(){return 0}get maxComputeWorkgroupStorageSize(){return 0}get maxComputeInvocationsPerWorkgroup(){return 0}get maxComputeWorkgroupSizeX(){return 0}get maxComputeWorkgroupSizeY(){return 0}get maxComputeWorkgroupSizeZ(){return 0}get maxComputeWorkgroupsPerDimension(){return 0}getParameter(t){return this.limits[t]===void 0&&(this.limits[t]=this.gl.getParameter(t)),this.limits[t]||0}}class wn extends Qr{constructor(t,r){super(t,r);f(this,"device");f(this,"gl");f(this,"handle");f(this,"colorAttachments",[]);f(this,"depthStencilAttachment",null);const i=r.handle,s=i===null;this.device=t,this.gl=t.gl,this.handle=i||s?i:this.gl.createFramebuffer(),s||(t._setWebGLDebugMetadata(this.handle,this,{spector:this.props}),r.handle||(this.autoCreateAttachmentTextures(),this.updateAttachments()))}destroy(){super.destroy(),!this.destroyed&&this.handle!==null&&!this.props.handle&&this.gl.deleteFramebuffer(this.handle)}updateAttachments(){const t=this.gl.bindFramebuffer(36160,this.handle);for(let r=0;r<this.colorAttachments.length;++r){const i=this.colorAttachments[r];if(i){const s=36064+r;this._attachTextureView(s,i)}}if(this.depthStencilAttachment){const r=lE(this.depthStencilAttachment.props.format);this._attachTextureView(r,this.depthStencilAttachment)}if(this.device.props.debug){const r=this.gl.checkFramebufferStatus(36160);if(r!==36053)throw new Error(`Framebuffer ${pE(r)}`)}this.gl.bindFramebuffer(36160,t)}_attachTextureView(t,r){const{gl:i}=this.device,{texture:s}=r,o=r.props.baseMipLevel,a=r.props.baseArrayLayer;switch(i.bindTexture(s.glTarget,s.handle),s.glTarget){case 35866:case 32879:i.framebufferTextureLayer(36160,t,s.handle,o,a);break;case 34067:const c=mE(a);i.framebufferTexture2D(36160,t,c,s.handle,o);break;case 3553:i.framebufferTexture2D(36160,t,3553,s.handle,o);break;default:throw new Error("Illegal texture type")}i.bindTexture(s.glTarget,null)}resizeAttachments(t,r){if(this.handle===null){this.width=t,this.height=r;return}super.resizeAttachments(t,r)}}function mE(n){return n<34069?n+34069:n}function pE(n){switch(n){case 36053:return"success";case 36054:return"Mismatched attachments";case 36055:return"No attachments";case 36057:return"Height/width mismatch";case 36061:return"Unsupported or split attachments";case 36182:return"Samples mismatch";default:return`${n}`}}class gE extends Nf{constructor(t,r){super(r);f(this,"device");f(this,"handle",null);f(this,"_framebuffer",null);this.device=t,this._setAutoCreatedCanvasId(`${this.device.id}-canvas`),this._configureDevice()}get[Symbol.toStringTag](){return"WebGLCanvasContext"}_configureDevice(){var r,i,s;(this.drawingBufferWidth!==((r=this._framebuffer)==null?void 0:r.width)||this.drawingBufferHeight!==((i=this._framebuffer)==null?void 0:i.height))&&((s=this._framebuffer)==null||s.resize([this.drawingBufferWidth,this.drawingBufferHeight]))}_getCurrentFramebuffer(){return this._framebuffer||(this._framebuffer=new wn(this.device,{id:"canvas-context-framebuffer",handle:null,width:this.drawingBufferWidth,height:this.drawingBufferHeight})),this._framebuffer}}class bE extends R_{constructor(t,r={}){super(r);f(this,"device");f(this,"handle",null);f(this,"context2d");this.device=t;const i=`${this[Symbol.toStringTag]}(${this.id})`;if(!this.device.getDefaultCanvasContext().offscreenCanvas)throw new Error(`${i}: WebGL PresentationContext requires the default CanvasContext canvas to be an OffscreenCanvas`);const o=this.canvas.getContext("2d");if(!o)throw new Error(`${i}: Failed to create 2d presentation context`);this.context2d=o,this._setAutoCreatedCanvasId(`${this.device.id}-presentation-canvas`),this._configureDevice(),this._startObservers()}get[Symbol.toStringTag](){return"WebGLPresentationContext"}present(){this._resizeDrawingBufferIfNeeded(),this.device.submit();const t=this.device.getDefaultCanvasContext(),[r,i]=t.getDrawingBufferSize();if(!(this.drawingBufferWidth===0||this.drawingBufferHeight===0||r===0||i===0||t.canvas.width===0||t.canvas.height===0)){if(r!==this.drawingBufferWidth||i!==this.drawingBufferHeight||t.canvas.width!==this.drawingBufferWidth||t.canvas.height!==this.drawingBufferHeight)throw new Error(`${this[Symbol.toStringTag]}(${this.id}): Default canvas context size ${r}x${i} does not match presentation size ${this.drawingBufferWidth}x${this.drawingBufferHeight}`);this.context2d.clearRect(0,0,this.drawingBufferWidth,this.drawingBufferHeight),this.context2d.drawImage(t.canvas,0,0)}}_configureDevice(){}_getCurrentFramebuffer(t){const r=this.device.getDefaultCanvasContext();return r.setDrawingBufferSize(this.drawingBufferWidth,this.drawingBufferHeight),r.getCurrentFramebuffer(t)}}const Os={};function _E(n="id"){Os[n]=Os[n]||1;const e=Os[n]++;return`${n}-${e}`}class Tn extends F{constructor(t,r={}){super(t,r);f(this,"device");f(this,"gl");f(this,"handle");f(this,"glTarget");f(this,"glUsage");f(this,"glIndexType",5123);f(this,"byteLength",0);f(this,"bytesUsed",0);this.device=t,this.gl=this.device.gl;const i=typeof r=="object"?r.handle:void 0;this.handle=i||this.gl.createBuffer(),t._setWebGLDebugMetadata(this.handle,this,{spector:{...this.props,data:typeof this.props.data}}),this.glTarget=yE(this.props.usage),this.glUsage=vE(this.props.usage),this.glIndexType=this.props.indexType==="uint32"?5125:5123,r.data?this._initWithData(r.data,r.byteOffset,r.byteLength):this._initWithByteLength(r.byteLength||0)}destroy(){!this.destroyed&&this.handle&&(this.removeStats(),this.props.handle?this.trackDeallocatedReferencedMemory("Buffer"):(this.trackDeallocatedMemory(),this.gl.deleteBuffer(this.handle)),this.destroyed=!0,this.handle=null)}_initWithData(t,r=0,i=t.byteLength+r){const s=this.glTarget;this.gl.bindBuffer(s,this.handle),this.gl.bufferData(s,i,this.glUsage),this.gl.bufferSubData(s,r,t),this.gl.bindBuffer(s,null),this.bytesUsed=i,this.byteLength=i,this._setDebugData(t,r,i),this.props.handle?this.trackReferencedMemory(i,"Buffer"):this.trackAllocatedMemory(i)}_initWithByteLength(t){let r=t;t===0&&(r=new Float32Array(0));const i=this.glTarget;return this.gl.bindBuffer(i,this.handle),this.gl.bufferData(i,r,this.glUsage),this.gl.bindBuffer(i,null),this.bytesUsed=t,this.byteLength=t,this._setDebugData(null,0,t),this.props.handle?this.trackReferencedMemory(t,"Buffer"):this.trackAllocatedMemory(t),this}write(t,r=0){const i=ArrayBuffer.isView(t)?t:new Uint8Array(t),s=36663;this.gl.bindBuffer(s,this.handle),this.gl.bufferSubData(s,r,i),this.gl.bindBuffer(s,null),this._setDebugData(t,r,t.byteLength)}async mapAndWriteAsync(t,r=0,i=this.byteLength-r){const s=new ArrayBuffer(i);await t(s,"copied"),this.write(s,r)}async readAsync(t=0,r){return this.readSyncWebGL(t,r)}async mapAndReadAsync(t,r=0,i){const s=await this.readAsync(r,i);return await t(s.buffer,"copied")}readSyncWebGL(t=0,r){r=r??this.byteLength-t;const i=new Uint8Array(r),s=0;return this.gl.bindBuffer(36662,this.handle),this.gl.getBufferSubData(36662,t,i,s,r),this.gl.bindBuffer(36662,null),this._setDebugData(i,t,r),i}}function yE(n){return n&F.INDEX?34963:n&F.VERTEX?34962:n&F.UNIFORM?35345:34962}function vE(n){return n&F.INDEX||n&F.VERTEX?35044:n&F.UNIFORM?35048:35044}function xE(n){var r;const e=n.split(/\r?\n/),t=[];for(const i of e){if(i.length<=1)continue;const s=i.trim(),o=i.split(":"),a=(r=o[0])==null?void 0:r.trim();if(o.length===2){const[p,g]=o;if(!p||!g){t.push({message:s,type:Ar(a||"info"),lineNum:0,linePos:0});continue}t.push({message:g.trim(),type:Ar(p),lineNum:0,linePos:0});continue}const[c,l,u,...d]=o;if(!c||!l||!u){t.push({message:o.slice(1).join(":").trim()||s,type:Ar(a||"info"),lineNum:0,linePos:0});continue}let h=parseInt(u,10);Number.isNaN(h)&&(h=0);let m=parseInt(l,10);Number.isNaN(m)&&(m=0),t.push({message:d.join(":").trim(),type:Ar(c),lineNum:h,linePos:m})}return t}function Ar(n){const e=["warning","error","info"],t=n.toLowerCase();return e.includes(t)?t:"info"}class SE extends Yr{constructor(t,r){super(t,r);f(this,"device");f(this,"handle");f(this,"_compilationInfoLog","");this.device=t;const i=this.props.handle;switch(this.props.stage){case"vertex":this.handle=i||this.device.gl.createShader(35633);break;case"fragment":this.handle=i||this.device.gl.createShader(35632);break;default:throw new Error(this.props.stage)}t._setWebGLDebugMetadata(this.handle,this,{spector:this.props});const s=this._compile(this.source);s&&typeof s.catch=="function"&&s.catch(()=>{this.compilationStatus="error"})}destroy(){this.handle&&(this.removeStats(),this.device.gl.deleteShader(this.handle),this.destroyed=!0,this.handle.destroyed=!0)}get asyncCompilationStatus(){return this._waitForCompilationComplete().then(()=>(this._getCompilationStatus(),this.compilationStatus))}async getCompilationInfo(){return await this._waitForCompilationComplete(),this.getCompilationInfoSync()}getCompilationInfoSync(){const t=this._getCompilationInfoLog();return t?xE(t):[]}getTranslatedSource(){const r=this.device.getExtension("WEBGL_debug_shaders").WEBGL_debug_shaders;return(r==null?void 0:r.getTranslatedShaderSource(this.handle))||null}_compile(t){t=t.startsWith("#version ")?t:`#version 300 es
${t}`;const{gl:r}=this.device;if(r.shaderSource(this.handle,t),r.compileShader(this.handle),!this.device.props.debug){this.compilationStatus="pending";return}if(!this.device.features.has("compilation-status-async-webgl")){if(this._getCompilationStatus(),this.debugShader(),this.compilationStatus==="error")throw new Error(this._getCompilationErrorMessage(t));return}return S.once(1,"Shader compilation is asynchronous")(),this._waitForCompilationComplete().then(()=>{S.info(2,`Shader ${this.id} - async compilation complete: ${this.compilationStatus}`)(),this._getCompilationStatus(),this.debugShader()})}async _waitForCompilationComplete(){const t=async s=>await new Promise(o=>setTimeout(o,s));if(!this.device.features.has("compilation-status-async-webgl")){await t(10);return}const{gl:i}=this.device;for(;;){if(i.getShaderParameter(this.handle,37297))return;await t(10)}}_getCompilationStatus(){this.compilationStatus=this.device.gl.getShaderParameter(this.handle,35713)?"success":"error",this.compilationStatus==="error"&&this._getCompilationInfoLog()}_getCompilationErrorMessage(t){var d;const r=`${this.props.stage} shader ${this.props.id}`,i=wE(this._getCompilationInfoLog()),s=this.getCompilationInfoSync(),o=s.find(h=>h.type==="error"&&h.message.trim())||s.find(h=>h.message.trim())||s.find(h=>h.type==="error")||s[0];if(!o)return i?`GLSL compilation errors in ${r}: ${i}`:`GLSL compilation errors in ${r}: WebGL did not provide a shader compiler log`;const a=o.lineNum?(d=t.split(/\r?\n/)[o.lineNum-1])==null?void 0:d.trim():void 0,c=o.lineNum?` line ${o.lineNum}`:"",l=a?`
Source: ${a}`:"",u=o.message.trim()||i||"WebGL did not provide a shader compiler log";return`GLSL compilation errors in ${r}:${c}: ${u}${l}`}_getCompilationInfoLog(){var r;const t=(r=this.device.gl.getShaderInfoLog(this.handle))==null?void 0:r.trim();return t&&(this._compilationInfoLog=t),this._compilationInfoLog}}function wE(n){var e;return(e=n.split(/\r?\n/).find(t=>t.trim()))==null?void 0:e.trim()}function TE(n,e,t,r){if(IE(e))return r(n);const i=n;i.pushState();try{return EE(n,e),nn(i.gl,t),r(n)}finally{i.popState()}}function EE(n,e){const t=n,{gl:r}=t;if(e.cullMode)switch(e.cullMode){case"none":r.disable(2884);break;case"front":r.enable(2884),r.cullFace(1028);break;case"back":r.enable(2884),r.cullFace(1029);break}if(e.frontFace&&r.frontFace(dt("frontFace",e.frontFace,{ccw:2305,cw:2304})),e.unclippedDepth&&n.features.has("depth-clip-control")&&r.enable(34383),e.depthBias!==void 0&&(r.enable(32823),r.polygonOffset(e.depthBias,e.depthBiasSlopeScale||0)),e.provokingVertex&&n.features.has("provoking-vertex-webgl")){const s=t.getExtension("WEBGL_provoking_vertex").WEBGL_provoking_vertex,o=dt("provokingVertex",e.provokingVertex,{first:36429,last:36430});s==null||s.provokingVertexWEBGL(o)}if((e.polygonMode||e.polygonOffsetLine)&&n.features.has("polygon-mode-webgl")){if(e.polygonMode){const s=t.getExtension("WEBGL_polygon_mode").WEBGL_polygon_mode,o=dt("polygonMode",e.polygonMode,{fill:6914,line:6913});s==null||s.polygonModeWEBGL(1028,o),s==null||s.polygonModeWEBGL(1029,o)}e.polygonOffsetLine&&r.enable(10754)}if(n.features.has("shader-clip-cull-distance-webgl")&&(e.clipDistance0&&r.enable(12288),e.clipDistance1&&r.enable(12289),e.clipDistance2&&r.enable(12290),e.clipDistance3&&r.enable(12291),e.clipDistance4&&r.enable(12292),e.clipDistance5&&r.enable(12293),e.clipDistance6&&r.enable(12294),e.clipDistance7&&r.enable(12295)),e.depthWriteEnabled!==void 0&&r.depthMask(RE("depthWriteEnabled",e.depthWriteEnabled)),e.depthCompare&&(e.depthCompare!=="always"?r.enable(2929):r.disable(2929),r.depthFunc(jo("depthCompare",e.depthCompare))),e.clearDepth!==void 0&&r.clearDepth(e.clearDepth),e.stencilWriteMask){const i=e.stencilWriteMask;r.stencilMaskSeparate(1028,i),r.stencilMaskSeparate(1029,i)}if(e.stencilReadMask&&S.warn("stencilReadMask not supported under WebGL"),e.stencilCompare){const i=e.stencilReadMask||4294967295,s=jo("depthCompare",e.stencilCompare);e.stencilCompare!=="always"?r.enable(2960):r.disable(2960),r.stencilFuncSeparate(1028,s,0,i),r.stencilFuncSeparate(1029,s,0,i)}if(e.stencilPassOperation&&e.stencilFailOperation&&e.stencilDepthFailOperation){const i=Fs("stencilPassOperation",e.stencilPassOperation),s=Fs("stencilFailOperation",e.stencilFailOperation),o=Fs("stencilDepthFailOperation",e.stencilDepthFailOperation);r.stencilOpSeparate(1028,s,o,i),r.stencilOpSeparate(1029,s,o,i)}switch(e.blend){case!0:r.enable(3042);break;case!1:r.disable(3042);break}if(e.blendColorOperation||e.blendAlphaOperation){const i=Kl("blendColorOperation",e.blendColorOperation||"add"),s=Kl("blendAlphaOperation",e.blendAlphaOperation||"add");r.blendEquationSeparate(i,s);const o=Rr("blendColorSrcFactor",e.blendColorSrcFactor||"one"),a=Rr("blendColorDstFactor",e.blendColorDstFactor||"zero"),c=Rr("blendAlphaSrcFactor",e.blendAlphaSrcFactor||"one"),l=Rr("blendAlphaDstFactor",e.blendAlphaDstFactor||"zero");r.blendFuncSeparate(o,a,c,l)}}function jo(n,e){return dt(n,e,{never:512,less:513,equal:514,"less-equal":515,greater:516,"not-equal":517,"greater-equal":518,always:519})}function Fs(n,e){return dt(n,e,{keep:7680,zero:0,replace:7681,invert:5386,"increment-clamp":7682,"decrement-clamp":7683,"increment-wrap":34055,"decrement-wrap":34056})}function Kl(n,e){return dt(n,e,{add:32774,subtract:32778,"reverse-subtract":32779,min:32775,max:32776})}function Rr(n,e,t="color"){return dt(n,e,{one:1,zero:0,src:768,"one-minus-src":769,dst:774,"one-minus-dst":775,"src-alpha":770,"one-minus-src-alpha":771,"dst-alpha":772,"one-minus-dst-alpha":773,"src-alpha-saturated":776,constant:t==="color"?32769:32771,"one-minus-constant":t==="color"?32770:32772,src1:768,"one-minus-src1":769,"src1-alpha":770,"one-minus-src1-alpha":771})}function AE(n,e){return`Illegal parameter ${e} for ${n}`}function dt(n,e,t){if(!(e in t))throw new Error(AE(n,e));return t[e]}function RE(n,e){return e}function IE(n){let e=!0;for(const t in n){e=!1;break}return e}function eh(n){const e={};return n.addressModeU&&(e[10242]=Us(n.addressModeU)),n.addressModeV&&(e[10243]=Us(n.addressModeV)),n.addressModeW&&(e[32882]=Us(n.addressModeW)),n.magFilter&&(e[10240]=Xo(n.magFilter)),(n.minFilter||n.mipmapFilter)&&(e[10241]=ME(n.minFilter||"linear",n.mipmapFilter)),n.lodMinClamp!==void 0&&(e[33082]=n.lodMinClamp),n.lodMaxClamp!==void 0&&(e[33083]=n.lodMaxClamp),n.type==="comparison-sampler"&&(e[34892]=34894),n.compare&&(e[34893]=jo("compare",n.compare)),n.maxAnisotropy&&(e[34046]=n.maxAnisotropy),e}function Us(n){switch(n){case"clamp-to-edge":return 33071;case"repeat":return 10497;case"mirror-repeat":return 33648}}function Xo(n){switch(n){case"nearest":return 9728;case"linear":return 9729}}function ME(n,e="none"){if(!e)return Xo(n);switch(e){case"none":return Xo(n);case"nearest":switch(n){case"nearest":return 9984;case"linear":return 9985}break;case"linear":switch(n){case"nearest":return 9986;case"linear":return 9987}}}class LE extends $t{constructor(t,r){super(t,r);f(this,"device");f(this,"handle");f(this,"parameters");this.device=t,this.parameters=eh(r),this.handle=r.handle||this.device.gl.createSampler(),this._setSamplerParameters(this.parameters)}destroy(){this.handle&&(this.device.gl.deleteSampler(this.handle),this.handle=void 0)}toString(){return`Sampler(${this.id},${JSON.stringify(this.props)})`}_setSamplerParameters(t){for(const[r,i]of Object.entries(t)){const s=Number(r);switch(s){case 33082:case 33083:this.device.gl.samplerParameterf(this.handle,s,i);break;default:this.device.gl.samplerParameteri(this.handle,s,i);break}}}}function qe(n,e,t){if(CE(e))return t(n);const{nocatch:r=!0}=e,i=ft.get(n);i.push(),nn(n,e);let s;if(r)s=t(n),i.pop();else try{s=t(n)}finally{i.pop()}return s}function CE(n){for(const e in n)return!1;return!0}class Bt extends Vt{constructor(t,r){super(t,{...N.defaultProps,...r});f(this,"device");f(this,"gl");f(this,"handle");f(this,"texture");this.device=t,this.gl=this.device.gl,this.handle=null,this.texture=r.texture}}function th(n){return PE[n]}const PE={5124:"sint32",5125:"uint32",5122:"sint16",5123:"uint16",5120:"sint8",5121:"uint8",5126:"float32",5131:"float16",33635:"uint16",32819:"uint16",32820:"uint16",33640:"uint32",35899:"uint32",35902:"uint32",34042:"uint32",36269:"uint32"};class En extends N{constructor(t,r){super(t,r,{byteAlignment:1});f(this,"device");f(this,"gl");f(this,"handle");f(this,"sampler");f(this,"view");f(this,"glTarget");f(this,"glFormat");f(this,"glType");f(this,"glInternalFormat");f(this,"compressed");f(this,"_textureUnit",0);f(this,"_framebuffer",null);f(this,"_framebufferAttachmentKey",null);this.device=t,this.gl=this.device.gl;const i=Jd(this.props.format);if(this.glTarget=OE(this.props.dimension),this.glInternalFormat=i.internalFormat,this.glFormat=i.format,this.glType=i.type,this.compressed=i.compressed,this.isHandleBorrowed&&this.props.handle===void 0)throw new Error("Borrowed WebGL textures require a texture handle");if(this.handle=this.props.handle||this.gl.createTexture(),this.device._setWebGLDebugMetadata(this.handle,this,{spector:this.props}),!this.isHandleBorrowed){this.gl.bindTexture(this.glTarget,this.handle);const{dimension:s,width:o,height:a,depth:c,mipLevels:l,glTarget:u,glInternalFormat:d}=this;if(!this.compressed)switch(s){case"2d":case"cube":this.gl.texStorage2D(u,l,d,o,a);break;case"2d-array":case"3d":this.gl.texStorage3D(u,l,d,o,a,c);break;default:throw new Error(s)}this.gl.bindTexture(this.glTarget,null),this._initializeData(r.data)}this.ownsHandle?this.trackAllocatedMemory(this.getAllocatedByteLength(),"Texture"):this.trackReferencedMemory(this.getAllocatedByteLength(),"Texture"),this.isHandleBorrowed||this.setSampler(this.props.sampler),this.view=new Bt(this.device,{...this.props,texture:this}),Object.seal(this)}destroy(){var t;this.handle&&((t=this._framebuffer)==null||t.destroy(),this._framebuffer=null,this._framebufferAttachmentKey=null,this.removeStats(),this.ownsHandle?(this.gl.deleteTexture(this.handle),this.trackDeallocatedMemory("Texture")):this.trackDeallocatedReferencedMemory("Texture"),this.destroyed=!0)}createView(t){return new Bt(this.device,{...t,texture:this})}clone(t){if(this.isHandleBorrowed&&t&&(t.width!==this.width||t.height!==this.height))throw new Error(`Cannot resize borrowed read-only ${this}`);return super.clone(t)}setSampler(t={}){this._assertWritable("set sampler parameters on"),super.setSampler(t);const r=eh(this.sampler.props);this._setSamplerParameters(r)}copyExternalImage(t){this._assertWritable("copy external image data into");const r=this._normalizeCopyExternalImageOptions(t);if(r.sourceX||r.sourceY)throw new Error("WebGL does not support sourceX/sourceY)");const{glFormat:i,glType:s}=this,{image:o,depth:a,mipLevel:c,x:l,y:u,z:d,width:h,height:m}=r,p=un(this.glTarget,this.dimension,d),g=r.flipY?{37440:!0}:{};return this.gl.bindTexture(this.glTarget,this.handle),qe(this.gl,g,()=>{switch(this.dimension){case"2d":case"cube":this.gl.texSubImage2D(p,c,l,u,h,m,i,s,o);break;case"2d-array":case"3d":this.gl.texSubImage3D(p,c,l,u,d,h,m,a,i,s,o);break;default:}}),this.gl.bindTexture(this.glTarget,null),{width:r.width,height:r.height}}copyElementImage(t){this._assertWritable("copy element image data into");const r=this._normalizeCopyElementImageOptions(t),{glFormat:i}=this,{element:s,depth:o,mipLevel:a,sourceX:c,sourceY:l,sourceWidth:u,sourceHeight:d,x:h,y:m,z:p,width:g,height:b}=r,_=un(this.glTarget,this.dimension,p),y=r.flipY?{37440:!0}:{},v=this.gl;if(o!==1||this.dimension!=="2d"&&this.dimension!=="cube")throw new Error(`${this} copyElementImage only supports 2d and cube textures on WebGL`);if(a!==0||h!==0||m!==0)throw new Error(`${this} copyElementImage only supports full base-level uploads on WebGL`);if(typeof v.texElementImage2D!="function")throw new Error(`${this} copyElementImage is not supported by this WebGL implementation`);return this.gl.bindTexture(this.glTarget,this.handle),qe(this.gl,y,()=>{var w;(w=v.texElementImage2D)==null||w.call(v,_,i,s,{sx:c,sy:l,swidth:u??g,sheight:d??b,width:g,height:b})}),this.gl.bindTexture(this.glTarget,null),{width:r.width,height:r.height}}copyImageData(t){super.copyImageData(t)}readBuffer(t={},r){if(!r)throw new Error(`${this} readBuffer requires a destination buffer`);const i=this._getSupportedColorReadOptions(t),s=t.byteOffset??0,o=this.computeMemoryLayout(i);if(r.byteLength<s+o.byteLength)throw new Error(`${this} readBuffer target is too small (${r.byteLength} < ${s+o.byteLength})`);const a=r;this.gl.bindBuffer(35051,a.handle);try{this._readColorTextureLayers(i,o,c=>{this.gl.readPixels(i.x,i.y,i.width,i.height,this.glFormat,this.glType,s+c)})}finally{this.gl.bindBuffer(35051,null)}return r}async readDataAsync(t={}){throw new Error(`${this} readDataAsync is deprecated; use readBuffer() with an explicit destination buffer or DynamicTexture.readAsync()`)}writeBuffer(t,r={}){this._assertWritable("write buffer data into");const i=this._normalizeTextureWriteOptions(r),{width:s,height:o,depthOrArrayLayers:a,mipLevel:c,byteOffset:l,x:u,y:d,z:h}=i,{glFormat:m,glType:p,compressed:g}=this,b=un(this.glTarget,this.dimension,h);if(g)throw new Error("writeBuffer for compressed textures is not implemented in WebGL");const{bytesPerPixel:_}=this.device.getTextureFormatInfo(this.format),y=_?i.bytesPerRow/_:void 0,v={3317:this.byteAlignment,...y!==void 0?{3314:y}:{},32878:i.rowsPerImage};this.gl.bindTexture(this.glTarget,this.handle),this.gl.bindBuffer(35052,t.handle),qe(this.gl,v,()=>{switch(this.dimension){case"2d":case"cube":this.gl.texSubImage2D(b,c,u,d,s,o,m,p,l);break;case"2d-array":case"3d":this.gl.texSubImage3D(b,c,u,d,h,s,o,a,m,p,l);break;default:}}),this.gl.bindBuffer(35052,null),this.gl.bindTexture(this.glTarget,null)}writeData(t,r={}){this._assertWritable("write data into");const i=this._normalizeTextureWriteOptions(r),s=ArrayBuffer.isView(t)?t:new Uint8Array(t),{width:o,height:a,depthOrArrayLayers:c,mipLevel:l,x:u,y:d,z:h,byteOffset:m}=i,{glFormat:p,glType:g,compressed:b}=this,_=un(this.glTarget,this.dimension,h);let y;if(!b){const{bytesPerPixel:M}=this.device.getTextureFormatInfo(this.format);M&&(y=i.bytesPerRow/M)}const v=this.compressed?{}:{3317:this.byteAlignment,...y!==void 0?{3314:y}:{},32878:i.rowsPerImage},w=NE(s,m),x=b?BE(s,m):s,T=this._getMipLevelSize(l),A=u===0&&d===0&&h===0&&o===T.width&&a===T.height&&c===T.depthOrArrayLayers;this.gl.bindTexture(this.glTarget,this.handle),this.gl.bindBuffer(35052,null),qe(this.gl,v,()=>{switch(this.dimension){case"2d":case"cube":b?A?this.gl.compressedTexImage2D(_,l,p,o,a,0,x):this.gl.compressedTexSubImage2D(_,l,u,d,o,a,p,x):this.gl.texSubImage2D(_,l,u,d,o,a,p,g,s,w);break;case"2d-array":case"3d":b?A?this.gl.compressedTexImage3D(_,l,p,o,a,c,0,x):this.gl.compressedTexSubImage3D(_,l,u,d,h,o,a,c,p,x):this.gl.texSubImage3D(_,l,u,d,h,o,a,c,p,g,s,w);break;default:}}),this.gl.bindTexture(this.glTarget,null)}_getRowByteAlignment(t,r){return 1}_getFramebuffer(){return this._framebuffer||(this._framebuffer=this.device.createFramebuffer({id:`framebuffer-for-${this.id}`,width:this.width,height:this.height,colorAttachments:[this]})),this._framebuffer}readDataSyncWebGL(t={}){const r=this._getSupportedColorReadOptions(t),i=this.computeMemoryLayout(r),s=th(this.glType),o=Mf(s),a=new o(i.byteLength/o.BYTES_PER_ELEMENT);return this._readColorTextureLayers(r,i,c=>{const l=new o(a.buffer,a.byteOffset+c,i.bytesPerImage/o.BYTES_PER_ELEMENT);this.gl.readPixels(r.x,r.y,r.width,r.height,this.glFormat,this.glType,l)}),a.buffer}_readColorTextureLayers(t,r,i){const s=this._getFramebuffer(),o=r.bytesPerRow/r.bytesPerPixel,a={3333:this.byteAlignment,...o!==t.width?{3330:o}:{}},c=this.gl.getParameter(3074),l=this.gl.bindFramebuffer(36160,s.handle);try{this.gl.readBuffer(36064),qe(this.gl,a,()=>{for(let u=0;u<t.depthOrArrayLayers;u++)this._attachReadSubresource(s,t.mipLevel,t.z+u),i(u*r.bytesPerImage)})}finally{this.gl.bindFramebuffer(36160,l||null),this.gl.readBuffer(c)}}_attachReadSubresource(t,r,i){const s=`${r}:${i}`;if(this._framebufferAttachmentKey!==s){switch(this.dimension){case"2d":this.gl.framebufferTexture2D(36160,36064,3553,this.handle,r);break;case"cube":this.gl.framebufferTexture2D(36160,36064,un(this.glTarget,this.dimension,i),this.handle,r);break;case"2d-array":case"3d":this.gl.framebufferTextureLayer(36160,36064,this.handle,r,i);break;default:throw new Error(`${this} color readback does not support ${this.dimension} textures`)}if(this.device.props.debug){const o=Number(this.gl.checkFramebufferStatus(36160));if(o!==36053)throw new Error(`${t} incomplete for ${this} readback (${o})`)}this._framebufferAttachmentKey=s}}generateMipmapsWebGL(t){if(this._assertWritable("generate mipmaps for"),!(!(this.device.isTextureFormatRenderable(this.props.format)&&this.device.isTextureFormatFilterable(this.props.format))&&(S.warn(`${this} is not renderable or filterable, may not be able to generate mipmaps`)(),!(t!=null&&t.force))))try{this.gl.bindTexture(this.glTarget,this.handle),this.gl.generateMipmap(this.glTarget)}catch(i){S.warn(`Error generating mipmap for ${this}: ${i.message}`)()}finally{this.gl.bindTexture(this.glTarget,null)}}_setSamplerParameters(t){S.level>=2&&S.log(2,`${this.id} sampler parameters`,this.device.getGLKeys(t))(),this.gl.bindTexture(this.glTarget,this.handle);for(const[r,i]of Object.entries(t)){const s=Number(r),o=i;switch(s){case 33082:case 33083:this.gl.texParameterf(this.glTarget,s,o);break;case 10240:case 10241:this.gl.texParameteri(this.glTarget,s,o);break;case 10242:case 10243:case 32882:this.gl.texParameteri(this.glTarget,s,o);break;case 34046:this.device.features.has("texture-filterable-anisotropic-webgl")&&this.gl.texParameteri(this.glTarget,s,o);break;case 34892:case 34893:this.gl.texParameteri(this.glTarget,s,o);break}}this.gl.bindTexture(this.glTarget,null)}_getActiveUnit(){return this.gl.getParameter(34016)-33984}_bind(t){const{gl:r}=this;return t!==void 0&&(this._textureUnit=t,r.activeTexture(33984+t)),r.bindTexture(this.glTarget,this.handle),t}_unbind(t){const{gl:r}=this;return t!==void 0&&(this._textureUnit=t,r.activeTexture(33984+t)),r.bindTexture(this.glTarget,null),t}_assertWritable(t){if(this.isHandleBorrowed)throw new Error(`Cannot ${t} borrowed read-only ${this}`)}}function BE(n,e=0){return e?new n.constructor(n.buffer,n.byteOffset+e,(n.byteLength-e)/n.BYTES_PER_ELEMENT):n}function NE(n,e){if(e%n.BYTES_PER_ELEMENT!==0)throw new Error(`Texture byteOffset ${e} must align to typed array element size ${n.BYTES_PER_ELEMENT}`);return e/n.BYTES_PER_ELEMENT}function OE(n){switch(n){case"1d":break;case"2d":return 3553;case"3d":return 32879;case"cube":return 34067;case"2d-array":return 35866}throw new Error(n)}function un(n,e,t){return e==="cube"?34069+t:n}function FE(n,e,t,r){const i=n;let s=r;s===!0&&(s=1),s===!1&&(s=0);const o=typeof s=="number"?[s]:s;switch(t){case 35678:case 35680:case 35679:case 35682:case 36289:case 36292:case 36293:case 36298:case 36299:case 36300:case 36303:case 36306:case 36307:case 36308:case 36311:if(typeof r!="number")throw new Error("samplers must be set to integers");return n.uniform1i(e,r);case 5126:return n.uniform1fv(e,o);case 35664:return n.uniform2fv(e,o);case 35665:return n.uniform3fv(e,o);case 35666:return n.uniform4fv(e,o);case 5124:return n.uniform1iv(e,o);case 35667:return n.uniform2iv(e,o);case 35668:return n.uniform3iv(e,o);case 35669:return n.uniform4iv(e,o);case 35670:return n.uniform1iv(e,o);case 35671:return n.uniform2iv(e,o);case 35672:return n.uniform3iv(e,o);case 35673:return n.uniform4iv(e,o);case 5125:return i.uniform1uiv(e,o,1);case 36294:return i.uniform2uiv(e,o,2);case 36295:return i.uniform3uiv(e,o,3);case 36296:return i.uniform4uiv(e,o,4);case 35674:return n.uniformMatrix2fv(e,!1,o);case 35675:return n.uniformMatrix3fv(e,!1,o);case 35676:return n.uniformMatrix4fv(e,!1,o);case 35685:return i.uniformMatrix2x3fv(e,!1,o);case 35686:return i.uniformMatrix2x4fv(e,!1,o);case 35687:return i.uniformMatrix3x2fv(e,!1,o);case 35688:return i.uniformMatrix3x4fv(e,!1,o);case 35689:return i.uniformMatrix4x2fv(e,!1,o);case 35690:return i.uniformMatrix4x3fv(e,!1,o)}throw new Error("Illegal uniform")}function UE(n){return $E[n]}function Ha(n){return kE[n]}function nh(n){return!!rh[n]}function DE(n){return rh[n]}const kE={5126:"f32",35664:"vec2<f32>",35665:"vec3<f32>",35666:"vec4<f32>",5124:"i32",35667:"vec2<i32>",35668:"vec3<i32>",35669:"vec4<i32>",5125:"u32",36294:"vec2<u32>",36295:"vec3<u32>",36296:"vec4<u32>",35670:"f32",35671:"vec2<f32>",35672:"vec3<f32>",35673:"vec4<f32>",35674:"mat2x2<f32>",35685:"mat2x3<f32>",35686:"mat2x4<f32>",35687:"mat3x2<f32>",35675:"mat3x3<f32>",35688:"mat3x4<f32>",35689:"mat4x2<f32>",35690:"mat4x3<f32>",35676:"mat4x4<f32>"},rh={35678:{viewDimension:"2d",sampleType:"float"},35680:{viewDimension:"cube",sampleType:"float"},35679:{viewDimension:"3d",sampleType:"float"},35682:{viewDimension:"3d",sampleType:"depth"},36289:{viewDimension:"2d-array",sampleType:"float"},36292:{viewDimension:"2d-array",sampleType:"depth"},36293:{viewDimension:"cube",sampleType:"float"},36298:{viewDimension:"2d",sampleType:"sint"},36299:{viewDimension:"3d",sampleType:"sint"},36300:{viewDimension:"cube",sampleType:"sint"},36303:{viewDimension:"2d-array",sampleType:"uint"},36306:{viewDimension:"2d",sampleType:"uint"},36307:{viewDimension:"3d",sampleType:"uint"},36308:{viewDimension:"cube",sampleType:"uint"},36311:{viewDimension:"2d-array",sampleType:"uint"}},$E={uint8:5121,sint8:5120,unorm8:5121,snorm8:5120,uint16:5123,sint16:5122,unorm16:5123,snorm16:5122,uint32:5125,sint32:5124,float16:5131,float32:5126};function VE(n,e,t={}){const r={attributes:[],bindings:[]};r.attributes=GE(n,e);const i=HE(n,e,t);for(const c of i){const l=c.uniforms.map(u=>({name:u.name,format:u.format,byteOffset:u.byteOffset,byteStride:u.byteStride,arrayLength:u.arrayLength}));r.bindings.push({type:"uniform",name:c.name,group:0,location:c.location,visibility:(c.vertex?1:0)|(c.fragment?2:0),minBindingSize:c.byteLength,uniforms:l})}const s=WE(n,e);let o=0;for(const c of s)if(nh(c.type)){const{viewDimension:l,sampleType:u}=DE(c.type);r.bindings.push({type:"texture",name:c.name,group:0,location:o,viewDimension:l,sampleType:u}),c.textureUnit=o,o+=1}s.length&&(r.uniforms=s);const a=zE(n,e);return a!=null&&a.length&&(r.varyings=a),r}function GE(n,e){const t=[],r=n.getProgramParameter(e,35721);for(let i=0;i<r;i++){const s=n.getActiveAttrib(e,i);if(!s)throw new Error("activeInfo");const{name:o,type:a}=s,c=n.getAttribLocation(e,o);if(c>=0){const l=Ha(a),u=/instance/i.test(o)?"instance":"vertex";t.push({name:o,location:c,stepMode:u,type:l})}}return t.sort((i,s)=>i.location-s.location),t}function zE(n,e){const t=[],r=n.getProgramParameter(e,35971);for(let i=0;i<r;i++){const s=n.getTransformFeedbackVarying(e,i);if(!s)throw new Error("activeInfo");const{name:o,type:a,size:c}=s,l=Ha(a),{type:u,components:d}=ya(l);t.push({location:i,name:o,type:u,size:c*d})}return t.sort((i,s)=>i.location-s.location),t}function WE(n,e){const t=[],r=n.getProgramParameter(e,35718);for(let i=0;i<r;i++){const s=n.getActiveUniform(e,i);if(!s)throw new Error("activeInfo");const{name:o,size:a,type:c}=s,{name:l,isArray:u}=ZE(o);let d=n.getUniformLocation(e,l);const h={location:d,name:l,size:a,type:c,isArray:u};if(t.push(h),h.size>1)for(let m=0;m<h.size;m++){const p=`${l}[${m}]`;d=n.getUniformLocation(e,p);const g={...h,name:p,location:d};t.push(g)}}return t}function HE(n,e,t){const r=[],i=XE(n,e,t);for(const[o,a]of i){r.push(a);try{const c=ql(n,e,o,a.name);jE(c,a)}catch(c){const l=c instanceof Error?c.message:String(c);S.once(0,`WebGL uniform block reflection failed for "${a.name}"; using supplied std140 metadata. ${l}`)()}}const s=n.getProgramParameter(e,35382);if(!Number.isInteger(s)||s<0)throw new Error(`Failed to reflect WebGL uniform blocks: ACTIVE_UNIFORM_BLOCKS returned ${String(s)}`);for(let o=0;o<s;o++)i.has(o)||r.push(ql(n,e,o));return r.sort((o,a)=>o.location-a.location),r}function jE(n,e){for(const t of n.uniforms){const r=e.uniforms.find(i=>t.name===i.name||t.name.endsWith(`.${i.name}`));if(!r)throw new Error(`Failed to validate WebGL uniform block "${e.name}": reflected unexpected member "${t.name}"`);if(t.format!==r.format||t.arrayLength!==r.arrayLength||t.byteOffset!==r.byteOffset||t.byteStride!==r.byteStride)throw new Error(`Failed to validate WebGL uniform block "${e.name}": reflected layout for "${t.name}" does not match supplied std140 metadata`)}}function XE(n,e,t){var s;const r=new Map;for(const o of t.uniformBlockLayouts||[])r.set(o.name,qE(o));for(const o of((s=t.shaderLayout)==null?void 0:s.bindings)||[])QE(o)&&r.set(o.name,o);const i=new Map;for(const o of r.values()){const a=KE(n,e,o.name);if(!a)continue;const{blockIndex:c,blockName:l}=a;if(i.has(c))throw new Error(`Multiple supplied uniform block layouts resolve to active WebGL block "${l}"`);i.set(c,{name:l,location:c,byteLength:o.minBindingSize,vertex:!!(o.visibility&&o.visibility&1),fragment:!!(o.visibility&&o.visibility&2),uniformCount:o.uniforms.length,uniforms:o.uniforms.map(u=>({...u}))})}return i}function KE(n,e,t){const r=t.endsWith("Uniforms")?[t,t.slice(0,-8)]:[t,`${t}Uniforms`];for(const i of r){const s=n.getUniformBlockIndex(e,i);if(s!==4294967295){if(!Number.isInteger(s)||s<0)throw new Error(`Failed to resolve WebGL uniform block "${i}": getUniformBlockIndex returned ${String(s)}`);return{blockIndex:s,blockName:i}}}return null}function ql(n,e,t,r){const i=r||n.getActiveUniformBlockName(e,t);if(!i)throw new Error(`Failed to reflect WebGL uniform block at index ${t}: missing block name`);const s=(v,w)=>{const x=n.getActiveUniformBlockParameter(e,t,v);if(x==null)throw new Error(`Failed to reflect WebGL uniform block "${i}": ${w} returned null`);return x},o=st(s(35391,"UNIFORM_BLOCK_BINDING"),i,"UNIFORM_BLOCK_BINDING",0),a=st(s(35392,"UNIFORM_BLOCK_DATA_SIZE"),i,"UNIFORM_BLOCK_DATA_SIZE",0),c=st(s(35394,"UNIFORM_BLOCK_ACTIVE_UNIFORMS"),i,"UNIFORM_BLOCK_ACTIVE_UNIFORMS",0),l=ih(s(35395,"UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES"),i,"UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES",c),u=fn(n,e,l,35383,"UNIFORM_TYPE",i,c),d=fn(n,e,l,35384,"UNIFORM_SIZE",i,c),h=fn(n,e,l,35386,"UNIFORM_BLOCK_INDEX",i,c),m=fn(n,e,l,35387,"UNIFORM_OFFSET",i,c),p=fn(n,e,l,35388,"UNIFORM_ARRAY_STRIDE",i,c),g=[];for(let v=0;v<c;v++){if(h[v]!==t)throw new Error(`Failed to reflect WebGL uniform block "${i}": active uniform index ${l[v]} belongs to block ${h[v]}, expected ${t}`);const w=l[v],x=n.getActiveUniform(e,w);if(!x)throw new Error(`Failed to reflect WebGL uniform block "${i}": getActiveUniform(${w}) returned null`);const T=st(u[v],i,`UNIFORM_TYPE[${v}]`,1),A=st(d[v],i,`UNIFORM_SIZE[${v}]`,1),M=st(m[v],i,`UNIFORM_OFFSET[${v}]`,0),L=st(p[v],i,`UNIFORM_ARRAY_STRIDE[${v}]`,0);if(x.type!==T||x.size!==A)throw new Error(`Failed to reflect WebGL uniform block "${i}": getActiveUniform(${w}) disagrees with getActiveUniforms`);g.push({name:x.name,format:Ha(T),arrayLength:A,byteOffset:M,byteStride:L})}const b={name:i,location:o,byteLength:a,vertex:!!s(35396,"UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER"),fragment:!!s(35398,"UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER"),uniformCount:c,uniforms:g},_=new Set(b.uniforms.map(v=>v.name.split(".")[0]).filter(v=>!!v)),y=b.name.replace(/Uniforms$/,"");if(_.size===1&&!_.has(b.name)&&!_.has(y)){const[v]=_;S.warn(`Uniform block "${b.name}" uses GLSL instance "${v}". luma.gl binds uniform buffers by block name ("${b.name}") and alias ("${y}"). Prefer matching the instance name to one of those to avoid confusing silent mismatches.`)()}return b}function fn(n,e,t,r,i,s,o){const a=n.getActiveUniforms(e,t,r);if(a===null)throw new Error(`Failed to reflect WebGL uniform block "${s}": ${i} returned null`);return ih(a,s,i,o)}function ih(n,e,t,r){if(!Array.isArray(n)&&!ArrayBuffer.isView(n))throw new Error(`Failed to reflect WebGL uniform block "${e}": ${t} returned a non-array value`);const i=Array.from(n);if(i.length!==r||i.some(s=>!Number.isInteger(s)))throw new Error(`Failed to reflect WebGL uniform block "${e}": ${t} returned ${i.length} invalid values, expected ${r}`);return i}function st(n,e,t,r){if(!Number.isInteger(n)||n<r)throw new Error(`Failed to reflect WebGL uniform block "${e}": ${t} returned ${String(n)}`);return n}function qE(n){const e=xa(n.uniformTypes,{layout:"std140"}),t=YE(n.uniformTypes,e.fields);return{type:"uniform",name:n.name,group:0,location:0,minBindingSize:e.byteLength,uniforms:t}}function YE(n,e){const t=[],r=(s,o)=>{if(typeof o=="string"){const a=e[s];if(!a)throw new Error(`Missing std140 layout field ${s}`);t.push({name:s,format:a.shaderType,arrayLength:1,byteOffset:a.offset*4,byteStride:0});return}if(Array.isArray(o)){i(s,o[0],o[1]);return}for(const[a,c]of Object.entries(o))r(`${s}.${a}`,c)},i=(s,o,a)=>{if(typeof o=="string"){const c=e[`${s}[0]`],l=a>1?e[`${s}[1]`]:void 0;if(!c)throw new Error(`Missing std140 array layout field ${s}[0]`);t.push({name:`${s}[0]`,format:c.shaderType,arrayLength:a,byteOffset:c.offset*4,byteStride:l?(l.offset-c.offset)*4:0});return}if(Array.isArray(o))throw new Error(`Nested uniform arrays are not supported for ${s}`);for(const[c,l]of Object.entries(o)){if(typeof l!="string")throw new Error(`Composite uniform array members are not supported for ${s}`);const u=`${s}[0].${c}`,d=`${s}[1].${c}`,h=e[u],m=a>1?e[d]:void 0;if(!h)throw new Error(`Missing std140 array layout field ${u}`);t.push({name:u,format:h.shaderType,arrayLength:a,byteOffset:h.offset*4,byteStride:m?(m.offset-h.offset)*4:0})}};for(const[s,o]of Object.entries(n))r(s,o);return t}function QE(n){return n.type==="uniform"&&Number.isInteger(n.minBindingSize)&&n.minBindingSize>=0&&Array.isArray(n.uniforms)&&n.uniforms.every(e=>typeof e.name=="string"&&typeof e.format=="string"&&Number.isInteger(e.arrayLength)&&e.arrayLength>0&&Number.isInteger(e.byteOffset)&&e.byteOffset>=0&&Number.isInteger(e.byteStride)&&e.byteStride>=0)}function ZE(n){if(n[n.length-1]!=="]")return{name:n,length:1,isArray:!1};const t=/([^[]*)(\[[0-9]+\])?/.exec(n);return{name:Kr(t==null?void 0:t[1],`Failed to parse GLSL uniform name ${n}`),length:t!=null&&t[2]?1:0,isArray:!!(t!=null&&t[2])}}class JE extends Ye{constructor(t,r){super(t,r);f(this,"device");f(this,"handle");f(this,"vs");f(this,"fs");f(this,"introspectedLayout");f(this,"bindings",{});f(this,"uniforms",{});f(this,"varyings",null);f(this,"_uniformCount",0);f(this,"_uniformSetters",{});this.device=t;const i=this.sharedRenderPipeline||this.device._createSharedRenderPipelineWebGL(r);this.sharedRenderPipeline=i,this.handle=i.handle,this.vs=i.vs,this.fs=i.fs,this.linkStatus=i.linkStatus,this.introspectedLayout=VE(this.device.gl,this.handle,{uniformBlockLayouts:r._uniformBlockLayouts,shaderLayout:r.shaderLayout}),this.device._setWebGLDebugMetadata(this.handle,this,{spector:{id:this.props.id}}),this.shaderLayout=r.shaderLayout?e3(this.introspectedLayout,r.shaderLayout):this.introspectedLayout}get[Symbol.toStringTag](){return"WEBGLRenderPipeline"}destroy(){this.destroyed||(this.sharedRenderPipeline&&!this.props._sharedRenderPipeline&&this.sharedRenderPipeline.destroy(),this.destroyResource())}setBindings(t,r){const i=po(_a(this.shaderLayout,t));for(const[s,o]of Object.entries(i)){const a=sh(this.shaderLayout,s);if(a){switch(o||S.warn(`Unsetting binding "${s}" in render pipeline "${this.id}"`)(),a.type){case"uniform":if(!(o instanceof Tn)&&!(o.buffer instanceof Tn))throw new Error("buffer value");break;case"texture":if(!(o instanceof Bt||o instanceof En||o instanceof wn))throw new Error(`${this} Bad texture binding for ${s}`);break;case"sampler":S.warn(`Ignoring sampler ${s}`)();break;default:throw new Error(a.type)}this.bindings[s]=o}else{const c=this.shaderLayout.bindings.map(l=>`"${l.name}"`).join(", ");r!=null&&r.disableWarnings||S.warn(`No binding "${s}" in render pipeline "${this.id}", expected one of ${c}`,o)()}}}draw(t){const r=t.renderPass,i=t.bindGroups?po(t.bindGroups):t.bindings||this.bindings;return r.setPipeline(this),r.setBindings(i),r.setVertexArray(t.vertexArray),r.draw({parameters:t.parameters,topology:t.topology,isInstanced:t.isInstanced,vertexCount:t.vertexCount,indexCount:t.indexCount,instanceCount:t.instanceCount,firstVertex:t.firstVertex,firstIndex:t.firstIndex,firstInstance:t.firstInstance,baseVertex:t.baseVertex,transformFeedback:t.transformFeedback,uniforms:t.uniforms})}_areTexturesRenderable(t){let r=!0;for(const i of this.shaderLayout.bindings)Yl(t,i.name)||(S.warn(`Binding ${i.name} not found in ${this.id}`)(),r=!1);return r}_applyBindings(t,r){if(this._syncLinkStatus(),this.linkStatus!=="success")return;const{gl:i}=this.device;i.useProgram(this.handle);let s=0,o=0;for(const a of this.shaderLayout.bindings){const c=Yl(t,a.name);if(!c)throw new Error(`No value for binding ${a.name} in ${this.id}`);switch(a.type){case"uniform":const{name:l}=a,u=i.getUniformBlockIndex(this.handle,l);if(u===4294967295)throw new Error(`Invalid uniform block name ${l}`);if(i.uniformBlockBinding(this.handle,u,o),c instanceof Tn)i.bindBufferBase(35345,o,c.handle);else{const h=c;i.bindBufferRange(35345,o,h.buffer.handle,h.offset||0,h.size||h.buffer.byteLength-(h.offset||0))}o+=1;break;case"texture":if(!(c instanceof Bt||c instanceof En||c instanceof wn))throw new Error("texture");let d;if(c instanceof Bt)d=c.texture;else if(c instanceof En)d=c;else if(c instanceof wn&&c.colorAttachments[0]instanceof Bt)S.warn("Passing framebuffer in texture binding may be deprecated. Use fbo.colorAttachments[0] instead")(),d=c.colorAttachments[0].texture;else throw new Error("No texture");i.activeTexture(33984+s),i.bindTexture(d.glTarget,d.handle),s+=1;break;case"sampler":break;case"storage":case"read-only-storage":throw new Error(`binding type '${a.type}' not supported in WebGL`)}}}_applyUniforms(t){for(const r of this.shaderLayout.uniforms||[]){const{name:i,location:s,type:o,textureUnit:a}=r,c=t[i]??a;c!==void 0&&FE(this.device.gl,s,o,c)}}_syncLinkStatus(){this.linkStatus=this.sharedRenderPipeline.linkStatus}}function e3(n,e){const t={...n,attributes:n.attributes.map(r=>({...r})),bindings:n.bindings.map(r=>({...r}))};for(const r of(e==null?void 0:e.attributes)||[]){const i=t.attributes.find(s=>s.name===r.name);i?(i.type=r.type||i.type,i.stepMode=r.stepMode||i.stepMode):S.warn(`shader layout attribute ${r.name} not present in shader`)}for(const r of(e==null?void 0:e.bindings)||[]){const i=sh(t,r.name);if(!i){S.warn(`shader layout binding ${r.name} not present in shader`);continue}Object.assign(i,r)}return t}function sh(n,e){return n.bindings.find(t=>t.name===e||t.name===`${e}Uniforms`||`${t.name}Uniforms`===e)}function Yl(n,e){return n[e]||n[`${e}Uniforms`]||n[e.replace(/Uniforms$/,"")]}const Ql=4;class t3 extends O_{constructor(t,r){super(t,r);f(this,"device");f(this,"handle");f(this,"vs");f(this,"fs");f(this,"linkStatus","pending");this.device=t,this.handle=r.handle||this.device.gl.createProgram(),this.vs=r.vs,this.fs=r.fs,r.varyings&&r.varyings.length>0&&this.device.gl.transformFeedbackVaryings(this.handle,r.varyings,r.bufferMode||35981),this._linkShaders()}destroy(){this.destroyed||(this.device.gl.useProgram(null),this.device.gl.deleteProgram(this.handle),this.handle.destroyed=!0,this.destroyResource())}async _linkShaders(){const{gl:t}=this.device;if(t.attachShader(this.handle,this.vs.handle),t.attachShader(this.handle,this.fs.handle),S.time(Ql,`linkProgram for ${this.id}`)(),t.linkProgram(this.handle),S.timeEnd(Ql,`linkProgram for ${this.id}`)(),!this.device.features.has("compilation-status-async-webgl")){const i=this._getLinkStatus();this._reportLinkStatus(i);return}S.once(1,"RenderPipeline linking is asynchronous")(),await this._waitForLinkComplete(),S.info(2,`RenderPipeline ${this.id} - async linking complete: ${this.linkStatus}`)();const r=this._getLinkStatus();this._reportLinkStatus(r)}async _reportLinkStatus(t){var r;switch(t){case"success":return;default:const i=t==="link-error"?"Link error":"Validation error";switch(this.vs.compilationStatus){case"error":throw this.vs.debugShader(),new Error(`${this} ${i} during compilation of ${this.vs}`);case"pending":await this.vs.asyncCompilationStatus,this.vs.debugShader();break}switch((r=this.fs)==null?void 0:r.compilationStatus){case"error":throw this.fs.debugShader(),new Error(`${this} ${i} during compilation of ${this.fs}`);case"pending":await this.fs.asyncCompilationStatus,this.fs.debugShader();break}const s=this.device.gl.getProgramInfoLog(this.handle);this.device.reportError(new Error(`${i} during ${t}: ${s}`),this)(),this.device.debug()}}_getLinkStatus(){const{gl:t}=this.device;return t.getProgramParameter(this.handle,35714)?(this._initializeSamplerUniforms(),t.validateProgram(this.handle),t.getProgramParameter(this.handle,35715)?(this.linkStatus="success","success"):(this.linkStatus="error","validation-error")):(this.linkStatus="error","link-error")}_initializeSamplerUniforms(){const{gl:t}=this.device;t.useProgram(this.handle);let r=0;const i=t.getProgramParameter(this.handle,35718);for(let s=0;s<i;s++){const o=t.getActiveUniform(this.handle,s);if(o&&nh(o.type)){const a=o.name.endsWith("[0]"),c=a?o.name.slice(0,-3):o.name,l=t.getUniformLocation(this.handle,c);l!==null&&(r=this._assignSamplerUniform(l,o,a,r))}}}_assignSamplerUniform(t,r,i,s){const{gl:o}=this.device;if(i&&r.size>1){const a=Int32Array.from({length:r.size},(c,l)=>s+l);return o.uniform1iv(t,a),s+r.size}return o.uniform1i(t,s),s+1}async _waitForLinkComplete(){const t=async s=>await new Promise(o=>setTimeout(o,s));if(!this.device.features.has("compilation-status-async-webgl")){await t(10);return}const{gl:i}=this.device;for(;;){if(i.getProgramParameter(this.handle,37297))return;await t(10)}}}class n3 extends _o{constructor(t,r={}){super(t,r);f(this,"device");f(this,"handle",null);f(this,"commands",[]);this.device=t}_executeCommands(t=this.commands){for(const r of t)switch(r.name){case"copy-buffer-to-buffer":r3(this.device,r.options);break;case"copy-buffer-to-texture":i3(this.device,r.options);break;case"copy-texture-to-buffer":s3(this.device,r.options);break;case"copy-texture-to-texture":o3(this.device,r.options);break;default:throw new Error(r.name)}}}function r3(n,e){const t=e.sourceBuffer,r=e.destinationBuffer;n.gl.bindBuffer(36662,t.handle),n.gl.bindBuffer(36663,r.handle),n.gl.copyBufferSubData(36662,36663,e.sourceOffset??0,e.destinationOffset??0,e.size),n.gl.bindBuffer(36662,null),n.gl.bindBuffer(36663,null)}function i3(n,e){const{sourceBuffer:t,byteOffset:r=0,destinationTexture:i,mipLevel:s=0,origin:o=[0,0,0],aspect:a="all",bytesPerRow:c,rowsPerImage:l,size:u}=e;if(a!=="all")throw new Error("copyBufferToTexture aspect is not supported in WebGL");i.writeBuffer(t,{byteOffset:r,bytesPerRow:c,rowsPerImage:l,mipLevel:s,x:o[0]??0,y:o[1]??0,z:o[2]??0,width:u[0],height:u[1],depthOrArrayLayers:u[2]})}function s3(n,e){const{sourceTexture:t,mipLevel:r=0,aspect:i="all",width:s=e.sourceTexture.width,height:o=e.sourceTexture.height,depthOrArrayLayers:a,origin:c=[0,0,0],destinationBuffer:l,byteOffset:u=0,bytesPerRow:d,rowsPerImage:h}=e;if(t instanceof N){t.readBuffer({x:c[0]??0,y:c[1]??0,z:c[2]??0,width:s,height:o,depthOrArrayLayers:a,mipLevel:r,aspect:i,byteOffset:u},l);return}if(i!=="all")throw new Error("aspect not supported in WebGL");if(r!==0||a!==void 0||d||h)throw new Error("not implemented");const{framebuffer:m,destroyFramebuffer:p}=oh(t);let g;try{const b=l,_=s||m.width,y=o||m.height,v=Kr(m.colorAttachments[0]),w=Jd(v.texture.props.format),x=w.format,T=w.type;n.gl.bindBuffer(35051,b.handle),g=n.gl.bindFramebuffer(36160,m.handle),n.gl.readPixels(c[0],c[1],_,y,x,T,u)}finally{n.gl.bindBuffer(35051,null),g!==void 0&&n.gl.bindFramebuffer(36160,g),p&&m.destroy()}}function o3(n,e){const{sourceTexture:t,destinationMipLevel:r=0,origin:i=[0,0],destinationOrigin:s=[0,0,0],destinationTexture:o}=e;let{width:a=e.destinationTexture.width,height:c=e.destinationTexture.height}=e;const{framebuffer:l,destroyFramebuffer:u}=oh(t),[d=0,h=0]=i,[m,p,g]=s,b=n.gl.bindFramebuffer(36160,l.handle);let _,y;if(o instanceof En)_=o,a=Number.isFinite(a)?a:_.width,c=Number.isFinite(c)?c:_.height,_._bind(0),y=_.glTarget;else throw new Error("invalid destination");switch(y){case 3553:case 34067:n.gl.copyTexSubImage2D(y,r,m,p,d,h,a,c);break;case 35866:case 32879:n.gl.copyTexSubImage3D(y,r,m,p,g,d,h,a,c);break}_&&_._unbind(),n.gl.bindFramebuffer(36160,b),u&&l.destroy()}function oh(n){if(n instanceof N){const{width:e,height:t,id:r}=n;return{framebuffer:n.device.createFramebuffer({id:`framebuffer-for-${r}`,width:e,height:t,colorAttachments:[n]}),destroyFramebuffer:!0}}return{framebuffer:n,destroyFramebuffer:!1}}function a3(n){switch(n){case"point-list":return 0;case"line-list":return 1;case"line-strip":return 3;case"triangle-list":return 4;case"triangle-strip":return 5;default:throw new Error(n)}}function c3(n){switch(n){case"point-list":return 0;case"line-list":return 1;case"line-strip":return 1;case"triangle-list":return 4;case"triangle-strip":return 4;default:throw new Error(n)}}const l3=[1,2,4,8];class u3 extends go{constructor(t,r){var a;super(t,r);f(this,"device");f(this,"handle",null);f(this,"glParameters",{});f(this,"pipeline",null);f(this,"bindings",{});f(this,"bindingsPipeline",null);f(this,"vertexArray",null);this.device=t;const i=this.props.framebuffer,s=!i||i.handle===null;s&&t.getDefaultCanvasContext()._resizeDrawingBufferIfNeeded();let o;if(!((a=r==null?void 0:r.parameters)!=null&&a.viewport))if(!s&&i){const{width:c,height:l}=i;o=[0,0,c,l]}else{const[c,l]=t.getDefaultCanvasContext().getDrawingBufferSize();o=[0,0,c,l]}if(this.device.pushState(),this.setParameters({viewport:o,...this.props.parameters}),!s&&(i!=null&&i.colorAttachments.length)){const c=i.colorAttachments.map((l,u)=>36064+u);this.device.gl.drawBuffers(c)}else s&&this.device.gl.drawBuffers([1029]);this.clear(),this.props.timestampQuerySet&&this.props.beginTimestampIndex!==void 0&&this.props.timestampQuerySet.writeTimestamp(this.props.beginTimestampIndex)}end(){this.destroyed||(this.props.timestampQuerySet&&this.props.endTimestampIndex!==void 0&&this.props.timestampQuerySet.writeTimestamp(this.props.endTimestampIndex),this.device.popState(),this.destroy())}pushDebugGroup(t){}popDebugGroup(){}insertDebugMarker(t){}executeBundles(t){throw new Error("Render bundles are only supported in WebGPU")}setParameters(t={}){const r={...this.glParameters};r.framebuffer=this.props.framebuffer||null,this.props.depthReadOnly&&(r.depthMask=!this.props.depthReadOnly),r.stencilMask=this.props.stencilReadOnly?0:1,r[35977]=this.props.discard,t.viewport&&(t.viewport.length>=6?(r.viewport=t.viewport.slice(0,4),r.depthRange=[t.viewport[4],t.viewport[5]]):r.viewport=t.viewport),t.scissorRect&&(r.scissorTest=!0,r.scissor=t.scissorRect),t.blendConstant&&(r.blendColor=t.blendConstant),t.stencilReference!==void 0&&(r[2967]=t.stencilReference,r[36003]=t.stencilReference),"colorMask"in t&&(r.colorMask=l3.map(i=>!!(i&t.colorMask))),this.glParameters=r,nn(this.device.gl,r)}setPipeline(t){this.pipeline=t}setBindings(t,r){if(!this.pipeline)throw new Error("RenderPass.setPipeline() must be called before setBindings()");this.bindings=po(_a(this.pipeline.shaderLayout,t)),this.bindingsPipeline=this.pipeline}setVertexArray(t){this.vertexArray=t}draw(t){var v;const r=this.pipeline,i=this.vertexArray;if(!r)throw new Error("RenderPass.setPipeline() must be called before draw()");if(!i)throw new Error("RenderPass.setVertexArray() must be called before draw()");if(r.shaderLayout.bindings.length>0&&this.bindingsPipeline!==r)throw new Error("RenderPass.setBindings() must be called after setPipeline() before draw()");r._syncLinkStatus();const{parameters:s=r.props.parameters,topology:o=r.props.topology,vertexCount:a,indexCount:c,instanceCount:l,isInstanced:u=!1,firstVertex:d=0,transformFeedback:h,uniforms:m=r.uniforms}=t,p=a3(o),g=!!i.indexBuffer,b=(v=i.indexBuffer)==null?void 0:v.glIndexType,_=c??a??0;if(r.linkStatus!=="success")return S.info(2,`RenderPipeline:${r.id}.draw() aborted - waiting for shader linking`)(),!1;if(!r._areTexturesRenderable(this.bindings))return S.info(2,`RenderPipeline:${r.id}.draw() aborted - textures not yet loaded`)(),!1;this.device.gl.useProgram(r.handle),i.bindBeforeRender(this);const y=h;return y&&y.begin(r.props.topology),r._applyBindings(this.bindings,{disableWarnings:r.props.disableWarnings}),r._applyUniforms(m),TE(this.device,s,this.glParameters,()=>{g&&u?this.device.gl.drawElementsInstanced(p,_,b,d,l||0):g?this.device.gl.drawElements(p,_,b,d):u?this.device.gl.drawArraysInstanced(p,d,a||0,l||0):this.device.gl.drawArrays(p,d,a||0),y&&y.end()}),i.unbindAfterRender(this),!0}drawIndirect(t,r=0){throw new Error("Indirect drawing is only supported in WebGPU")}drawIndexedIndirect(t,r=0){throw new Error("Indirect drawing is only supported in WebGPU")}beginOcclusionQuery(t){const r=this.props.occlusionQuerySet;r==null||r.beginOcclusionQuery()}endOcclusionQuery(){const t=this.props.occlusionQuerySet;t==null||t.endOcclusionQuery()}clear(){const t={...this.glParameters};let r=0;this.props.clearColors&&this.props.clearColors.forEach((i,s)=>{i&&this.clearColorBuffer(s,i)}),this.props.clearColor!==!1&&this.props.clearColors===void 0&&(r|=16384,t.clearColor=this.props.clearColor),this.props.clearDepth!==!1&&(r|=256,t.clearDepth=this.props.clearDepth),this.props.clearStencil!==!1&&(r|=1024,t.clearStencil=this.props.clearStencil),r!==0&&qe(this.device.gl,t,()=>{this.device.gl.clear(r)})}clearColorBuffer(t=0,r=[0,0,0,0]){qe(this.device.gl,{framebuffer:this.props.framebuffer},()=>{switch(r.constructor){case Int8Array:case Int16Array:case Int32Array:this.device.gl.clearBufferiv(6144,t,r);break;case Uint8Array:case Uint8ClampedArray:case Uint16Array:case Uint32Array:this.device.gl.clearBufferuiv(6144,t,r);break;case Float32Array:this.device.gl.clearBufferfv(6144,t,r);break;default:throw new Error("clearColorBuffer: color must be typed array")}})}}class Zl extends bo{constructor(t,r){super(t,r);f(this,"device");f(this,"handle",null);f(this,"commandBuffer");this.device=t,this.commandBuffer=new n3(t,{id:this.id,userData:this.userData})}destroy(){this.destroyResource()}finish(){return this.destroy(),this.commandBuffer}beginRenderPass(t={}){return new u3(this.device,this._applyTimeProfilingToPassProps(t))}beginComputePass(t={}){throw new Error("ComputePass not supported in WebGL")}copyBufferToBuffer(t){this.commandBuffer.commands.push({name:"copy-buffer-to-buffer",options:t})}copyBufferToTexture(t){this.commandBuffer.commands.push({name:"copy-buffer-to-texture",options:t})}copyTextureToBuffer(t){this.commandBuffer.commands.push({name:"copy-texture-to-buffer",options:t})}copyTextureToTexture(t){this.commandBuffer.commands.push({name:"copy-texture-to-texture",options:t})}pushDebugGroup(t){}popDebugGroup(){}insertDebugMarker(t){}resolveQuerySet(t,r,i){throw new Error("resolveQuerySet is not supported in WebGL")}writeTimestamp(t,r){t.writeTimestamp(r)}}function f3(n){const{target:e,source:t,start:r=0,count:i=1}=n,s=t.length,o=i*s;let a=0;for(let c=r;a<s;a++)e[c++]=t[a]??0;for(;a<o;)a<o-a?(e.copyWithin(r+a,r,r+a),a*=2):(e.copyWithin(r+a,r,r+o-a),a=o);return n.target}class ja extends yo{constructor(t,r){super(t,r);f(this,"device");f(this,"handle");f(this,"attributeInfosByLocation");f(this,"buffer",null);f(this,"bufferValue",null);this.device=t,this.handle=this.device.gl.createVertexArray(),this.attributeInfosByLocation=new Array(this.maxVertexAttributes).fill(null);for(const i of Object.values(zf(r.shaderLayout,r.bufferLayout)))this.attributeInfosByLocation[i.location]=i}get[Symbol.toStringTag](){return"VertexArray"}static isConstantAttributeZeroSupported(t){return mm()==="Chrome"}destroy(){var t;super.destroy(),this.buffer&&((t=this.buffer)==null||t.destroy()),this.handle&&(this.device.gl.deleteVertexArray(this.handle),this.handle=void 0)}setIndexBuffer(t){const r=t;if(r&&r.glTarget!==34963)throw new Error("Use .setBuffer()");this.device.gl.bindVertexArray(this.handle),this.device.gl.bindBuffer(34963,r?r.handle:null),this.indexBuffer=r,this.device.gl.bindVertexArray(null)}setBuffer(t,r){const i=r;if(i.glTarget===34963)throw new Error("Use .setIndexBuffer()");const{size:s,type:o,stride:a,offset:c,normalized:l,integer:u,divisor:d}=this._getAccessor(t);this.device.gl.bindVertexArray(this.handle),this.device.gl.bindBuffer(34962,i.handle),u?this.device.gl.vertexAttribIPointer(t,s,o,a,c):this.device.gl.vertexAttribPointer(t,s,o,l,a,c),this.device.gl.bindBuffer(34962,null),this.device.gl.enableVertexAttribArray(t),this.device.gl.vertexAttribDivisor(t,d||0),this.attributes[t]=i,this.device.gl.bindVertexArray(null)}setConstantWebGL(t,r){this._enable(t,!1),this.attributes[t]=r}bindBeforeRender(){this.device.gl.bindVertexArray(this.handle),this._applyConstantAttributes()}unbindAfterRender(){this.device.gl.bindVertexArray(null)}_applyConstantAttributes(){for(let t=0;t<this.maxVertexAttributes;++t){const r=this.attributes[t];ArrayBuffer.isView(r)&&this.device.setConstantAttributeWebGL(t,r)}}_getAccessor(t){const r=this.attributeInfosByLocation[t];if(!r)throw new Error(`Unknown attribute location ${t}`);const i=qd(r.bufferDataType);return{size:r.bufferComponents,type:i,stride:r.byteStride,offset:r.byteOffset,normalized:r.normalized,integer:r.integer,divisor:r.stepMode==="instance"?1:0}}_enable(t,r=!0){const s=ja.isConstantAttributeZeroSupported(this.device)||t!==0;(r||s)&&(t=Number(t),this.device.gl.bindVertexArray(this.handle),r?this.device.gl.enableVertexAttribArray(t):this.device.gl.disableVertexAttribArray(t),this.device.gl.bindVertexArray(null))}getConstantBuffer(t,r){const i=d3(r),s=i.byteLength*t,o=i.length*t;if(this.buffer&&s!==this.buffer.byteLength)throw new Error(`Buffer size is immutable, byte length ${s} !== ${this.buffer.byteLength}.`);let a=!this.buffer;if(this.buffer=this.buffer||this.device.createBuffer({byteLength:s}),a||(a=!h3(i,this.bufferValue)),a){const c=K_(r.constructor,o);f3({target:c,source:i,start:0,count:o}),this.buffer.write(c),this.bufferValue=r}return this.buffer}}function d3(n){return Array.isArray(n)?new Float32Array(n):n}function h3(n,e){if(!n||!e||n.length!==e.length||n.constructor!==e.constructor)return!1;for(let t=0;t<n.length;++t)if(n[t]!==e[t])return!1;return!0}class m3 extends vo{constructor(t,r){super(t,r);f(this,"device");f(this,"gl");f(this,"handle");f(this,"layout");f(this,"buffers",{});f(this,"unusedBuffers",{});f(this,"bindOnUse",!0);f(this,"_bound",!1);this.device=t,this.gl=t.gl,this.handle=this.props.handle||this.gl.createTransformFeedback(),this.layout=this.props.layout,r.buffers&&this.setBuffers(r.buffers),Object.seal(this)}destroy(){this.gl.deleteTransformFeedback(this.handle),super.destroy()}begin(t="point-list"){this.gl.bindTransformFeedback(36386,this.handle),this.bindOnUse&&this._bindBuffers(),this.gl.beginTransformFeedback(c3(t))}end(){this.gl.endTransformFeedback(),this.bindOnUse&&this._unbindBuffers(),this.gl.bindTransformFeedback(36386,null)}setBuffers(t){this.buffers={},this.unusedBuffers={},this.bind(()=>{for(const[r,i]of Object.entries(t))this.setBuffer(r,i)})}setBuffer(t,r){const i=this._getVaryingIndex(t),{buffer:s,byteLength:o,byteOffset:a}=this._getBufferRange(r);if(i<0){this.unusedBuffers[t]=s,S.warn(`${this.id} unusedBuffers varying buffer ${t}`)();return}this.buffers[i]={buffer:s,byteLength:o,byteOffset:a},this.bindOnUse||this._bindBuffer(i,s,a,o)}getBuffer(t){if(Jl(t))return this.buffers[t]||null;const r=this._getVaryingIndex(t);return this.buffers[r]??null}bind(t=this.handle){if(typeof t!="function")return this.gl.bindTransformFeedback(36386,t),this;let r;return this._bound?r=t():(this.gl.bindTransformFeedback(36386,this.handle),this._bound=!0,r=t(),this._bound=!1,this.gl.bindTransformFeedback(36386,null)),r}unbind(){this.bind(null)}_getBufferRange(t){if(t instanceof Tn)return{buffer:t,byteOffset:0,byteLength:t.byteLength};const{buffer:r,byteOffset:i=0,byteLength:s=t.buffer.byteLength}=t;return{buffer:r,byteOffset:i,byteLength:s}}_getVaryingIndex(t){if(Jl(t))return Number(t);for(const r of this.layout.varyings||[])if(t===r.name)return r.location;return-1}_bindBuffers(){for(const[t,r]of Object.entries(this.buffers)){const{buffer:i,byteLength:s,byteOffset:o}=this._getBufferRange(r);this._bindBuffer(Number(t),i,o,s)}}_unbindBuffers(){for(const t in this.buffers)this.gl.bindBufferBase(35982,Number(t),null)}_bindBuffer(t,r,i=0,s){const o=r&&r.handle;!o||s===void 0?this.gl.bindBufferBase(35982,t,o):this.gl.bindBufferRange(35982,t,o,i,s)}}function Jl(n){return typeof n=="number"?Number.isInteger(n):/^\d+$/.test(n)}class p3 extends xo{constructor(t,r){super(t,r);f(this,"device");f(this,"handle");f(this,"_timestampPairs",[]);f(this,"_pendingReads",new Set);f(this,"_occlusionQuery",null);f(this,"_occlusionActive",!1);if(this.device=t,r.type==="timestamp"){if(r.count<2)throw new Error("Timestamp QuerySet requires at least two query slots");this._timestampPairs=new Array(Math.ceil(r.count/2)).fill(null).map(()=>({activeQuery:null,completedQueries:[]})),this.handle=null}else{if(r.count>1)throw new Error("WebGL occlusion QuerySet can only have one value");const i=this.device.gl.createQuery();if(!i)throw new Error("WebGL query not supported");this.handle=i}Object.seal(this)}get[Symbol.toStringTag](){return"QuerySet"}destroy(){if(!this.destroyed){this.handle&&this.device.gl.deleteQuery(this.handle);for(const t of this._timestampPairs){t.activeQuery&&(this._cancelPendingQuery(t.activeQuery),this.device.gl.deleteQuery(t.activeQuery.handle));for(const r of t.completedQueries)this._cancelPendingQuery(r),this.device.gl.deleteQuery(r.handle)}this._occlusionQuery&&(this._cancelPendingQuery(this._occlusionQuery),this.device.gl.deleteQuery(this._occlusionQuery.handle));for(const t of Array.from(this._pendingReads))this._cancelPendingQuery(t);this.destroyResource()}}isResultAvailable(t){return this.props.type==="timestamp"?t===void 0?this._timestampPairs.some((r,i)=>this._isTimestampPairAvailable(i)):this._isTimestampPairAvailable(this._getTimestampPairIndex(t)):this._occlusionQuery?this._pollQueryAvailability(this._occlusionQuery):!1}async readResults(t){const r=(t==null?void 0:t.firstQuery)||0,i=(t==null?void 0:t.queryCount)||this.props.count-r;if(this._validateRange(r,i),this.props.type==="timestamp"){const s=new Array(i).fill(0n),o=Math.floor(r/2),a=Math.floor((r+i-1)/2);for(let c=o;c<=a;c++){const l=await this._consumeTimestampPairResult(c),u=c*2,d=u+1;u>=r&&u<r+i&&(s[u-r]=0n),d>=r&&d<r+i&&(s[d-r]=l)}return s}if(!this._occlusionQuery)throw new Error("Occlusion query has not been started");return[await this._consumeQueryResult(this._occlusionQuery)]}async readTimestampDuration(t,r){if(this.props.type!=="timestamp")throw new Error("Timestamp durations require a timestamp QuerySet");if(t<0||r>=this.props.count||r<=t)throw new Error("Timestamp duration range is out of bounds");if(t%2!==0||r!==t+1)throw new Error("WebGL timestamp durations require adjacent even/odd query indices");const i=await this._consumeTimestampPairResult(this._getTimestampPairIndex(t));return Number(i)/1e6}beginOcclusionQuery(){if(this.props.type!=="occlusion")throw new Error("Occlusion queries require an occlusion QuerySet");if(!this.handle)throw new Error("WebGL occlusion query is not available");if(this._occlusionActive)throw new Error("Occlusion query is already active");this.device.gl.beginQuery(35887,this.handle),this._occlusionQuery={handle:this.handle,promise:null,result:null,disjoint:!1,cancelled:!1,pollRequestId:null,resolve:null,reject:null},this._occlusionActive=!0}endOcclusionQuery(){if(!this._occlusionActive)throw new Error("Occlusion query is not active");this.device.gl.endQuery(35887),this._occlusionActive=!1}writeTimestamp(t){if(this.props.type!=="timestamp")throw new Error("Timestamp writes require a timestamp QuerySet");const r=this._getTimestampPairIndex(t),i=this._timestampPairs[r];if(t%2===0){if(i.activeQuery)throw new Error("Timestamp query pair is already active");const s=this.device.gl.createQuery();if(!s)throw new Error("WebGL query not supported");const o={handle:s,promise:null,result:null,disjoint:!1,cancelled:!1,pollRequestId:null,resolve:null,reject:null};this.device.gl.beginQuery(35007,s),i.activeQuery=o;return}if(!i.activeQuery)throw new Error("Timestamp query pair was ended before it was started");this.device.gl.endQuery(35007),i.completedQueries.push(i.activeQuery),i.activeQuery=null}_validateRange(t,r){if(t<0||r<0||t+r>this.props.count)throw new Error("Query read range is out of bounds")}_getTimestampPairIndex(t){if(t<0||t>=this.props.count)throw new Error("Query index is out of bounds");return Math.floor(t/2)}_isTimestampPairAvailable(t){const r=this._timestampPairs[t];return!r||r.completedQueries.length===0?!1:this._pollQueryAvailability(r.completedQueries[0])}_pollQueryAvailability(t){if(t.cancelled||this.destroyed)return t.result=0n,!0;if(t.result!==null||t.disjoint)return!0;if(!this.device.gl.getQueryParameter(t.handle,34919))return!1;const i=!!this.device.gl.getParameter(36795);return t.disjoint=i,t.result=i?0n:BigInt(this.device.gl.getQueryParameter(t.handle,34918)),!0}async _consumeTimestampPairResult(t){const r=this._timestampPairs[t];if(!r||r.completedQueries.length===0)throw new Error("Timestamp query pair has no completed result");const i=r.completedQueries.shift();try{return await this._consumeQueryResult(i)}finally{this.device.gl.deleteQuery(i.handle)}}_consumeQueryResult(t){return t.promise||(this._pendingReads.add(t),t.promise=new Promise((r,i)=>{t.resolve=r,t.reject=i;const s=()=>{if(t.pollRequestId=null,t.cancelled||this.destroyed){this._pendingReads.delete(t),t.promise=null,t.resolve=null,t.reject=null,r(0n);return}if(!this._pollQueryAvailability(t)){t.pollRequestId=this._requestAnimationFrame(s);return}this._pendingReads.delete(t),t.promise=null,t.resolve=null,t.reject=null,t.disjoint?i(new Error("GPU timestamp query was invalidated by a disjoint event")):r(t.result||0n)};s()})),t.promise}_cancelPendingQuery(t){if(this._pendingReads.delete(t),t.cancelled=!0,t.pollRequestId!==null&&(this._cancelAnimationFrame(t.pollRequestId),t.pollRequestId=null),t.resolve){const r=t.resolve;t.promise=null,t.resolve=null,t.reject=null,r(0n)}}_requestAnimationFrame(t){return requestAnimationFrame(t)}_cancelAnimationFrame(t){cancelAnimationFrame(t)}}class g3 extends So{constructor(t,r={}){super(t,{});f(this,"device");f(this,"gl");f(this,"handle");f(this,"signaled");f(this,"_signaled",!1);this.device=t,this.gl=t.gl;const i=this.props.handle||this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE,0);if(!i)throw new Error("Failed to create WebGL fence");this.handle=i,this.signaled=new Promise(s=>{const o=()=>{const a=this.gl.clientWaitSync(this.handle,0,0);a===this.gl.ALREADY_SIGNALED||a===this.gl.CONDITION_SATISFIED?(this._signaled=!0,s()):setTimeout(o,1)};o()})}isSignaled(){if(this._signaled)return!0;const t=this.gl.getSyncParameter(this.handle,this.gl.SYNC_STATUS);return this._signaled=t===this.gl.SIGNALED,this._signaled}destroy(){this.destroyed||this.gl.deleteSync(this.handle)}}function ah(n){switch(n){case 6406:case 33326:case 6403:case 36244:return 1;case 33339:case 33340:case 33328:case 33320:case 33319:return 2;case 6407:case 36248:case 34837:return 3;case 6408:case 36249:case 34836:return 4;default:return 0}}function b3(n){switch(n){case 5121:return 1;case 33635:case 32819:case 32820:return 2;case 5126:return 4;default:return 0}}function _3(n,e){var y;const{sourceX:t=0,sourceY:r=0,sourceAttachment:i=0}=e||{};let{target:s=null,sourceWidth:o,sourceHeight:a,sourceDepth:c,sourceFormat:l,sourceType:u}=e||{};const{framebuffer:d,deleteFramebuffer:h}=ch(n),{gl:m,handle:p}=d;o||(o=d.width),a||(a=d.height);const g=(y=d.colorAttachments[i])==null?void 0:y.texture;if(!g)throw new Error(`Invalid framebuffer attachment ${i}`);c=(g==null?void 0:g.depth)||1,l||(l=(g==null?void 0:g.glFormat)||6408),u||(u=(g==null?void 0:g.glType)||5121),s=x3(s,u,l,o,a);const b=Ze.getDataType(s);u=u||UE(b);const _=m.bindFramebuffer(36160,p);return m.readBuffer(36064+i),m.readPixels(t,r,o,a,l,u,s),m.readBuffer(36064),m.bindFramebuffer(36160,_||null),h&&d.destroy(),s}function y3(n,e){const{target:t,sourceX:r=0,sourceY:i=0,sourceFormat:s=6408,targetByteOffset:o=0}=e||{};let{sourceWidth:a,sourceHeight:c,sourceType:l}=e||{};const{framebuffer:u,deleteFramebuffer:d}=ch(n);a=a||u.width,c=c||u.height;const h=u;l=l||5121;let m=t;if(!m){const g=ah(s),b=b3(l),_=o+a*c*g*b;m=h.device.createBuffer({byteLength:_})}const p=n.device.createCommandEncoder();return p.copyTextureToBuffer({sourceTexture:n,width:a,height:c,origin:[r,i],destinationBuffer:m,byteOffset:o}),p.destroy(),d&&u.destroy(),m}function ch(n){return n instanceof Qr?{framebuffer:n,deleteFramebuffer:!1}:{framebuffer:v3(n),deleteFramebuffer:!0}}function v3(n,e){const{device:t,width:r,height:i,id:s}=n;return t.createFramebuffer({...e,id:`framebuffer-for-${s}`,width:r,height:i,colorAttachments:[n]})}function x3(n,e,t,r,i,s){if(n)return n;e||(e=5121);const o=th(e),a=Ze.getTypedArrayConstructor(o),c=ah(t);return new a(r*i*c)}function S3(n){const e=new Map;for(const t in n){const r=n[t];if(t<"a"){const i=e.get(r);e.set(r,i?`${i}, GL.${t}`:`GL.${t}`)}}return e}class oi extends Dt{constructor(t){var d;super({...t,id:t.id||_E("webgl-device")});f(this,"type","webgl");f(this,"handle");f(this,"features");f(this,"limits");f(this,"info");f(this,"canvasContext");f(this,"preferredColorFormat","rgba8unorm");f(this,"preferredDepthFormat","depth24plus");f(this,"commandEncoder");f(this,"lost");f(this,"_resolveContextLost");f(this,"_isLost",!1);f(this,"gl");f(this,"_glKeyByValue",null);f(this,"_constants");f(this,"extensions");f(this,"_polyfilled",!1);f(this,"spectorJS");const r=Dt._getCanvasContextProps(t);if(!r)throw new Error("WebGLDevice requires props.createCanvasContext to be set");const i=((d=r.canvas)==null?void 0:d.gl)??null;let s=oi.getDeviceFromContext(i);if(s)throw new Error(`WebGL context already attached to device ${s.id}`);this.canvasContext=new gE(this,r),this.lost=new Promise(h=>{this._resolveContextLost=h});const o={...t.webgl};r.alphaMode==="premultiplied"&&(o.premultipliedAlpha=!0),t.powerPreference!==void 0&&(o.powerPreference=t.powerPreference),t.failIfMajorPerformanceCaveat!==void 0&&(o.failIfMajorPerformanceCaveat=t.failIfMajorPerformanceCaveat);const c=this.props._handle||KT(this.canvasContext.canvas,{onContextLost:h=>{var m;return(m=this._resolveContextLost)==null?void 0:m.call(this,{reason:"destroyed",message:"Entered sleep mode, or too many apps or browser tabs are using the GPU."})},onContextRestored:h=>{console.log("WebGL context restored")}},o);if(!c)throw new Error("WebGL context creation failed");if(s=oi.getDeviceFromContext(c),s){if(t._reuseDevices)return S.log(1,`Not creating a new Device, instead returning a reference to Device ${s.id} already attached to WebGL context`,s)(),this.canvasContext.destroy(),s._reused=!0,s;throw new Error(`WebGL context already attached to device ${s.id}`)}this.handle=c,this.gl=c,this.spectorJS=UT({...this.props,gl:this.handle});const l=Ho(this.handle);l.device=this,l.extensions||(l.extensions={}),this.extensions=l.extensions,this.info=qT(this.gl,this.extensions),this.limits=new hE(this.gl),this.features=new dE(this.gl,this.extensions,this.props._disabledFeatures),this.props._initializeFeatures&&this.features.initializeFeatures(),new ft(this.gl,{log:(...h)=>S.log(1,...h)()}).trackState(this.gl,{copyState:!1}),(t.debug||t.debugWebGL)&&(this.gl=OT(this.gl,{traceWebGL:t.debugWebGL}),S.warn("WebGL debug mode activated. Performance reduced.")()),t.debugWebGL&&(S.level=Math.max(S.level,1)),this.commandEncoder=new Zl(this,{id:`${this}-command-encoder`}),this.canvasContext._startObservers()}static getDeviceFromContext(t){var r;return t?((r=t.luma)==null?void 0:r.device)??null:null}get[Symbol.toStringTag](){return"WebGLDevice"}toString(){return`${this[Symbol.toStringTag]}(${this.id})`}isVertexFormatSupported(t){switch(t){case"unorm8x4-bgra":return!1;default:return!0}}destroy(){var t;if(!this.props._reuseDevices&&!this._reused){this._isLost=!0,(t=this.commandEncoder)==null||t.destroy();const r=Ho(this.handle);r.device=null}}get isLost(){return this._isLost||this.gl.isContextLost()}createCanvasContext(t){throw new Error("WebGL only supports a single canvas")}createPresentationContext(t){return new bE(this,t||{})}createBuffer(t){const r=this._normalizeBufferProps(t);return new Tn(this,r)}createTexture(t){return new En(this,t)}createExternalTexture(t){throw new Error("ExternalTexture is not available on WebGL")}createSampler(t){return new LE(this,t)}createShader(t){return new SE(this,t)}createFramebuffer(t){return new wn(this,t)}createVertexArray(t){return new ja(this,t)}createTransformFeedback(t){return new m3(this,t)}createQuerySet(t){return new p3(this,t)}createFence(){return new g3(this)}createRenderPipeline(t){return new JE(this,t)}_createSharedRenderPipelineWebGL(t){return new t3(this,t)}createComputePipeline(t){throw new Error("ComputePipeline not supported in WebGL")}createRenderBundleEncoder(t){throw new Error("Render bundles are only supported in WebGPU")}createCommandEncoder(t={}){return new Zl(this,t)}submit(t){let r=null;t||({submittedCommandEncoder:r,commandBuffer:t}=this._finalizeDefaultCommandEncoderForSubmit());try{t._executeCommands(),r&&r.resolveTimeProfilingQuerySet().then(()=>{this.commandEncoder._gpuTimeMs=r._gpuTimeMs}).catch(()=>{})}finally{t.destroy()}}writeBufferViaCommandEncoder(t,r,i,s=0){r.write(i,s)}_finalizeDefaultCommandEncoderForSubmit(){const t=this.commandEncoder,r=t.finish();return this.commandEncoder.destroy(),this.commandEncoder=this.createCommandEncoder({id:t.props.id,timeProfilingQuerySet:t.getTimeProfilingQuerySet()}),{submittedCommandEncoder:t,commandBuffer:r}}readPixelsToArrayWebGL(t,r){return _3(t,r)}readPixelsToBufferWebGL(t,r){return y3(t,r)}setParametersWebGL(t){nn(this.gl,t)}getParametersWebGL(t){return Xd(this.gl,t)}withParametersWebGL(t,r){return qe(this.gl,t,r)}resetWebGL(){S.warn("WebGLDevice.resetWebGL is deprecated, use only for debugging")(),zT(this.gl)}_getDeviceSpecificTextureFormatCapabilities(t){return aE(this.gl,t,this.extensions)}loseDevice(){var s;let t=!1;const i=this.getExtension("WEBGL_lose_context").WEBGL_lose_context;return i&&(t=!0,i.loseContext()),(s=this._resolveContextLost)==null||s.call(this,{reason:"destroyed",message:"Application triggered context loss"}),t}pushState(){ft.get(this.gl).push()}popState(){ft.get(this.gl).pop()}getGLKey(t,r){const i=this._getGLKeyByValue().get(Number(t));return i||(r!=null&&r.emptyIfUnknown?"":String(t))}getGLKeys(t){const r={emptyIfUnknown:!0};return Object.entries(t).reduce((i,[s,o])=>(i[`${s}:${this.getGLKey(s,r)}`]=`${o}:${this.getGLKey(o,r)}`,i),{})}_getGLKeyByValue(){return this._glKeyByValue??(this._glKeyByValue=S3(this.gl)),this._glKeyByValue}setConstantAttributeWebGL(t,r){const i=this.limits.maxVertexAttributes;this._constants=this._constants||new Array(i).fill(null);const s=this._constants[t];switch(s&&A3(s,r)&&S.info(1,`setConstantAttributeWebGL(${t}) could have been skipped, value unchanged`)(),this._constants[t]=r,r.constructor){case Float32Array:w3(this,t,r);break;case Int32Array:T3(this,t,r);break;case Uint32Array:E3(this,t,r);break;default:throw new Error("constant")}}getExtension(t){return bt(this.gl,t,this.extensions),this.extensions}_setWebGLDebugMetadata(t,r,i){t.luma=r;const s={props:i.spector,id:i.spector.id};t.__SPECTOR_Metadata=s}}function w3(n,e,t){switch(t.length){case 1:n.gl.vertexAttrib1fv(e,t);break;case 2:n.gl.vertexAttrib2fv(e,t);break;case 3:n.gl.vertexAttrib3fv(e,t);break;case 4:n.gl.vertexAttrib4fv(e,t);break}}function T3(n,e,t){n.gl.vertexAttribI4iv(e,t)}function E3(n,e,t){n.gl.vertexAttribI4uiv(e,t)}function A3(n,e){if(!n||!e||n.length!==e.length||n.constructor!==e.constructor)return!1;for(let t=0;t<n.length;++t)if(n[t]!==e[t])return!1;return!0}const eu=Object.freeze(Object.defineProperty({__proto__:null,WebGLDevice:oi},Symbol.toStringTag,{value:"Module"})),lh=/^vertex-list<([^<>]+)>$/,uh=/^value-list<([^<>]+)>$/;function fh(n){return lh.test(n)}function dh(n){return uh.test(n)}function R3(n){const e=lh.exec(n),t=uh.exec(n),r=(e==null?void 0:e[1])??(t==null?void 0:t[1])??n;try{ae.getVertexFormatInfo(r)}catch{throw new Error(`Unsupported GPUVector format ${n}`)}return r}function er(n){const e=R3(n),t=fh(n),r=dh(n),i=ae.getVertexFormatInfo(e),s=i.type,o=i.normalized,a=I3(s,o);return{format:n,elementFormat:e,vertexList:t,valueList:r,type:s,signedDataType:M3(e,s),primitiveType:a,components:i.components,byteLength:i.byteLength,integer:i.integer,signed:i.signed,normalized:o,...i.webglOnly?{webglOnly:!0}:{}}}function I3(n,e){if(e)return"f32";switch(n){case"float32":return"f32";case"float16":return"f16";case"uint8":case"uint16":case"uint32":return"u32";case"sint8":case"sint16":case"sint32":return"i32";default:throw new Error(`Unsupported GPUVector component type ${n}`)}}function M3(n,e){if(n==="unorm10-10-10-2")return"uint32";switch(e){case"unorm8":return"uint8";case"snorm8":return"sint8";case"unorm16":return"uint16";case"snorm16":return"sint16";default:return e}}class ai{constructor(e){f(this,"buffer");f(this,"format");f(this,"length");f(this,"byteOffset");f(this,"byteStride");const t=ae.getVertexFormatInfo(e.format).byteLength,r=e.byteOffset??0,i=e.byteStride??t;if(Ds(e.length,"GPUDataView length"),Ds(r,"GPUDataView byteOffset"),Ds(i,"GPUDataView byteStride"),i<t)throw new Error(`GPUDataView byteStride ${i} is smaller than ${e.format} byte length ${t}`);const s=e.length===0?0:(e.length-1)*i+t,o=r+s;if(!Number.isSafeInteger(s)||!Number.isSafeInteger(o))throw new Error("GPUDataView byte range must use safe integers");if(o>e.buffer.byteLength)throw new Error("GPUDataView exceeds its backing buffer byte length");this.buffer=e.buffer,this.format=e.format,this.length=e.length,this.byteOffset=r,this.byteStride=i}get elementByteLength(){return ae.getVertexFormatInfo(this.format).byteLength}get byteLength(){return this.length===0?0:(this.length-1)*this.byteStride+this.elementByteLength}}function Ds(n,e){if(!Number.isSafeInteger(n)||n<0)throw new Error(`${e} must be a non-negative safe integer`)}function ks(n){return!!(n&&typeof n=="object"&&n.type==="struct")}function L3(n,e){const t=Object.entries(n);if(t.length===0)throw new Error("GPUData struct format must declare at least one field");return e==="packed"?C3(t):P3(t)}function C3(n){const e=[];let t=0,r=0;for(const[i,s]of n){const o=ae.getVertexFormatInfo(s);if(o.webglOnly)throw new Error(`Packed GPUData struct field "${i}" uses WebGL-only format ${s}`);t=tu(t,Math.min(4,o.byteLength)),e.push([i,Object.freeze({format:s,byteOffset:t,byteLength:o.byteLength})]),t+=o.byteLength,r+=o.components}return Object.freeze({type:"struct",layout:"packed",fields:Object.freeze(Object.fromEntries(e)),components:r,byteStride:tu(t,4),rowByteLength:t})}function P3(n){const e=Object.fromEntries(n.map(([o,a])=>[o,B3(a)])),t=xa(e,{layout:"wgsl-storage"}),r=[];let i=0,s=0;for(const[o,a]of n){const c=ae.getVertexFormatInfo(a),l=t.fields[o].offset*4;r.push([o,Object.freeze({format:a,byteOffset:l,byteLength:c.byteLength})]),i=Math.max(i,l+c.byteLength),s+=c.components}return Object.freeze({type:"struct",layout:"wgsl-storage",fields:Object.freeze(Object.fromEntries(r)),components:s,byteStride:t.byteLength,rowByteLength:i})}function B3(n){const e=ae.getVertexFormatInfo(n);switch(e.type){case"float32":return Ir("f32",e.components);case"sint32":return Ir("i32",e.components);case"uint32":return Ir("u32",e.components);default:{const t=Math.ceil(e.byteLength/4);return Ir("u32",t)}}}function Ir(n,e){return e===1?n:`vec${e}<${n}>`}function tu(n,e){return Math.ceil(n/e)*e}class N3{constructor(e,t){f(this,"buffer");f(this,"ownsDataBuffer");this.buffer=e,this.ownsDataBuffer=t}get ownsBuffer(){return this.ownsDataBuffer}transferBufferOwnership(e){if(e.buffer!==this.buffer)throw new Error("GPUData ownership can only be transferred to the same buffer");e.ownsDataBuffer=this.ownsDataBuffer,this.ownsDataBuffer=!1}destroy(){this.ownsDataBuffer&&(this.buffer.destroy(),this.ownsDataBuffer=!1)}}class O3 extends N3{constructor(t){const{buffer:r,format:i,length:s,valueLength:o,stride:a,byteOffset:c=0,byteStride:l,rowByteLength:u,ownsBuffer:d=!1,readbackMetadata:h,valueOffsets:m,nullBitmap:p,valueByteLength:g,dataType:b}=t;super(r,d);f(this,"dataType");f(this,"format");f(this,"length");f(this,"valueLength");f(this,"stride");f(this,"byteOffset");f(this,"byteStride");f(this,"rowByteLength");f(this,"readbackMetadata");f(this,"valueOffsets");f(this,"nullBitmap");f(this,"valueByteLength");let _;i?typeof i=="string"?_=i:_=L3(i,t.layout??"wgsl-storage"):_=void 0;const y=ks(_)?_:void 0,v=typeof _=="string"?er(_):void 0;if(this.dataType=b,this.format=_,this.length=s,this.valueLength=o??s,this.stride=a??(v==null?void 0:v.components)??(y==null?void 0:y.components)??l??u??1,this.byteOffset=c,this.rowByteLength=u??(y==null?void 0:y.rowByteLength)??(v==null?void 0:v.byteLength)??l??this.stride,this.byteStride=l??(y==null?void 0:y.byteStride)??this.rowByteLength,y){if(this.rowByteLength<y.rowByteLength)throw new Error(`GPUData rowByteLength ${this.rowByteLength} is smaller than struct format row byte length ${y.rowByteLength}`);if(this.byteStride<Math.max(y.byteStride,this.rowByteLength))throw new Error(`GPUData byteStride ${this.byteStride} is smaller than its struct row layout`)}this.readbackMetadata=h,this.valueOffsets=m,this.nullBitmap=p,this.valueByteLength=g}getChild(t){if(!ks(this.format))return null;const r=this.format.fields[t];return r?new ai({buffer:this.buffer,format:r.format,length:this.length,byteOffset:this.byteOffset+r.byteOffset,byteStride:this.byteStride}):null}getChildAt(t){if(!ks(this.format))return null;const r=Object.values(this.format.fields)[t];return r?new ai({buffer:this.buffer,format:r.format,length:this.length,byteOffset:this.byteOffset+r.byteOffset,byteStride:this.byteStride}):null}}const Ko=O3;class An{constructor(e){f(this,"name");f(this,"dataType");f(this,"format");f(this,"length");f(this,"valueLength");f(this,"stride");f(this,"byteOffset");f(this,"byteStride");f(this,"rowByteLength");f(this,"bufferLayout");f(this,"data",[]);f(this,"device");f(this,"bufferProps");f(this,"isAppendable",!1);f(this,"ownsDataChunks",!0);f(this,"ownedVectors",[]);f(this,"appendableByteLength",0);var t,r,i;switch(e.type){case"buffer":{const{name:s,buffer:o,format:a,length:c,valueLength:l=c,byteOffset:u=0,ownsBuffer:d=!1}=e,{stride:h,byteStride:m,rowByteLength:p}=nu(e);this.name=s,this.dataType=e.dataType,this.format=a,this.length=c,this.valueLength=l,this.stride=h,this.byteOffset=u,this.byteStride=m,this.rowByteLength=p,this.data.push(new Ko({buffer:o,format:a,length:c,valueLength:l,stride:h,byteOffset:u,byteStride:m,rowByteLength:p,ownsBuffer:d,dataType:e.dataType}));return}case"interleaved":{const{name:s,buffer:o,format:a,length:c,valueLength:l=c,byteOffset:u=0,byteStride:d,attributes:h,ownsBuffer:m=!1}=e;this.name=s,this.dataType=e.dataType,this.format=a,this.length=c,this.valueLength=l,this.stride=d,this.byteOffset=u,this.byteStride=d,this.rowByteLength=d,this.bufferLayout={name:s,byteStride:d,attributes:h},this.data.push(new Ko({buffer:o,format:a,length:c,valueLength:l,stride:d,byteOffset:u,byteStride:d,rowByteLength:d,ownsBuffer:m,dataType:e.dataType}));return}case"data":{const s=e.format??F3(e.data),o=s?er(s):void 0,{name:a,data:c,stride:l=((t=c[0])==null?void 0:t.stride)??(o==null?void 0:o.components)??1,valueLength:u=c.reduce((g,b)=>g+b.valueLength,0),byteStride:d=((r=c[0])==null?void 0:r.byteStride)??(o==null?void 0:o.byteLength),rowByteLength:h=((i=c[0])==null?void 0:i.rowByteLength)??(o==null?void 0:o.byteLength),bufferLayout:m,ownsData:p=!1}=e;if(d===void 0||h===void 0)throw new Error("GPUVector requires format or explicit byte layout metadata");s&&U3(c,s),this.name=a,this.dataType=e.dataType,this.format=s,this.length=c.reduce((g,b)=>g+b.length,0),this.valueLength=u,this.stride=l,this.byteOffset=c.length===1?c[0].byteOffset:0,this.byteStride=d,this.rowByteLength=h,this.bufferLayout=m,this.ownsDataChunks=p,this.data.push(...c);return}case"appendable":{const{name:s,device:o,format:a,valueLength:c=0,bufferProps:l}=e,{stride:u,byteStride:d,rowByteLength:h}=nu(e);this.name=s,this.dataType=e.dataType,this.format=a,this.length=0,this.valueLength=c,this.stride=u,this.byteOffset=0,this.byteStride=d,this.rowByteLength=h,this.device=o,this.bufferProps=l,this.isAppendable=!0;return}}}get ownsBuffer(){return this.ownsDataChunks&&this.data.some(e=>e.ownsBuffer)||this.ownedVectors.some(e=>e.ownsBuffer)}get capacityRows(){return this.isAppendable?this.length:void 0}get appendedByteLength(){return this.appendableByteLength}addData(e){if(this.format&&e.format!==this.format)throw new Error("GPUVector.addData() requires matching formats");if(e.byteStride!==this.byteStride)throw new Error("GPUVector.addData() requires matching byteStride");if(e.rowByteLength!==this.rowByteLength)throw new Error("GPUVector.addData() requires matching rowByteLength");return this.data.push(e),this.length+=e.length,this.valueLength+=e.valueLength,this}appendDataChunk(e,t=this.appendableByteLength+e.buffer.byteLength){if(!this.isAppendable)throw new Error("GPUVector.appendDataChunk() requires appendable vector storage");if(this.format&&e.format!==this.format)throw new Error("GPUVector.appendDataChunk() requires matching formats");if(e.byteStride!==this.byteStride||e.rowByteLength!==this.rowByteLength)throw new Error("GPUVector.appendDataChunk() requires matching byte layout metadata");return this.data.push(e),this.length+=e.length,this.valueLength+=e.valueLength,this.appendableByteLength=t,this}resetLastBatch(){if(!this.isAppendable)throw new Error("GPUVector.resetLastBatch() requires appendable vector storage");for(const e of this.data.splice(0))e.destroy();return this.length=0,this.valueLength=0,this.appendableByteLength=0,this}retainOwnedVectors(e){return this.ownedVectors.push(...e),this}transferBufferOwnership(e){const t=this.data[0],r=e.data[0];if(!t||!r||t.buffer!==r.buffer)throw new Error("GPUVector ownership can only be transferred to the same buffer");t.transferBufferOwnership(r)}destroy(){if(this.ownsDataChunks)for(const e of this.data)e.destroy();for(const e of this.ownedVectors.splice(0))e.destroy()}}function nu(n){const e=n.format?er(n.format):void 0,t=n.rowByteLength??n.byteStride??(e==null?void 0:e.byteLength);if(t===void 0)throw new Error("GPUVector requires format or explicit rowByteLength");return{stride:n.stride??(e==null?void 0:e.components)??1,byteStride:n.byteStride??t,rowByteLength:t}}function F3(n){var e;return(e=n[0])==null?void 0:e.format}function U3(n,e){if(n.find(r=>r.format!==e))throw new Error("GPUVector data chunks must share the declared format")}class D3{constructor(){f(this,"poolSize",20);f(this,"bufferPools");this.bufferPools=new Map}createOrReuse(e,t){if(t>e.limits.maxBufferSize)throw new Error(`Buffer pool cannot allocate ${t} bytes: device.limits.maxBufferSize is ${e.limits.maxBufferSize}`);const r=this.bufferPools.get(e),i=r?r.findIndex(o=>o.byteLength>=t):-1;if(i<0)return e.createBuffer({usage:F.VERTEX|F.STORAGE|F.COPY_DST|F.COPY_SRC,byteLength:t});const[s]=r.splice(i,1);return s}recycle(e){const t=e.device;this.bufferPools.has(t)||this.bufferPools.set(t,[]);const r=this.bufferPools.get(t),i=r.findIndex(s=>s.byteLength>e.byteLength);i<0?r.push(e):r.splice(i,0,e),this.purge()}purge(){for(const[e,t]of this.bufferPools){const r=e.isLost?0:this.poolSize;for(;t.length>r;)t.shift().destroy();t.length===0&&this.bufferPools.delete(e)}}}const Ee=new D3;class W{constructor(e){f(this,"type");f(this,"size");f(this,"normalized");f(this,"isConstant");f(this,"length");f(this,"ValueType");f(this,"source",null);f(this,"format");f(this,"_id");f(this,"_destroyed",!1);f(this,"_value");f(this,"_offset");f(this,"_stride");f(this,"_byteLength");f(this,"_gpuVector");f(this,"_bufferOwnership","owned");f(this,"_targetBuffer");const{id:t,value:r,buffer:i,gpuData:s,format:o,source:a=null,isConstant:c=!1}=e;if(!a&&!r&&!i&&!s)throw new Error("GPUDataEvaluator must have a value source");let{type:l,size:u,offset:d,stride:h,normalized:m,length:p}=e;if(a instanceof W?(l=l??a.type,u=u??a.size,d=d??a.offset,h=h??a.stride,m=m??a.normalized,p=p??a.length):(u=u??1,d=d??0,m=m??!1,p=c?1:p),!l)throw new Error("GPUDataEvaluator: type not defined");if(this._id=t,this.type=l,this.size=u,this.ValueType=_n(this.type),this._offset=d,this._stride=h||this.ValueType.BYTES_PER_ELEMENT*u,this.normalized=m,this.source=a,this.format=o,p===void 0)if(c)p=1;else{if(!r)throw new Error("GPUDataEvaluator: length not defined");p=Math.ceil(r.byteLength/this.stride)}this.isConstant=c,this.length=p;const g=this.ValueType.BYTES_PER_ELEMENT*this.size;this._byteLength=p===0?0:(p-1)*this.stride+g,this._value=r,this._bufferOwnership=a instanceof W||i||s?"borrowed":"owned",s?this._gpuVector=new An({type:"data",name:this._id??"data",format:s.format,data:[s],stride:s.stride,byteStride:s.byteStride,rowByteLength:s.rowByteLength}):i&&(this._gpuVector=this.createGPUVectorView({buffer:i,name:this._id,format:this.format}))}static get bufferPoolSize(){return Ee.poolSize}static set bufferPoolSize(e){if(!Number.isSafeInteger(e)||e<0)throw new Error("GPUDataEvaluator.bufferPoolSize must be a non-negative safe integer");Ee.poolSize=e,Ee.purge()}get offset(){return this._offset}get stride(){return this._stride}get byteLength(){return this._byteLength}static fromArray(e,{type:t,size:r=1,offset:i=0,stride:s=0,normalized:o=!1}){let a=t,c;if(Array.isArray(e)){a=a||"float32";const u=_n(a);c=new u(e)}else e instanceof Float64Array?(a="uint32",r*=2,i*=2,s*=2,c=new Uint32Array(e.buffer,e.byteOffset,e.byteLength/4)):(a=a||If(e),c=e);const l=`<${a} * ${r}>`;return new W({id:l,type:a,size:r,offset:i,stride:s,normalized:o,value:c})}static fromConstant(e,t="float32"){const r=_n(t);let i;return Array.isArray(e)?i=`[${e.join(",")}]`:(i=String(e),e=[e]),new W({id:i,isConstant:!0,type:t,size:e.length,value:new r(e)})}static fromGPUData(e,t={}){$3(e);const r=new ai({buffer:e.buffer,format:e.format,length:e.length,byteOffset:e.byteOffset,byteStride:e.byteStride});return new W({...iu(r),id:t.id,gpuData:e})}static fromGPUDataView(e,t={}){return new W({...iu(e),id:t.id,buffer:e.buffer})}get value(){return this._value||(this.source instanceof W?this.source.value:void 0)}get evaluated(){return!!this._gpuVector}get id(){return this._id}get gpuVector(){if(!this._gpuVector)throw new Error(`${this} not evaluated`);return this._gpuVector}get buffer(){return Mr(this.gpuVector)}setTargetBuffer({buffer:e,byteOffset:t=0,byteStride:r=this.stride}){if(this._destroyed)throw new Error(`GPUDataEvaluator ${this} already destroyed`);if(this._gpuVector)throw new Error(`GPUDataEvaluator ${this} already evaluated`);if(!this.source||this.source instanceof W)throw new Error("GPUDataEvaluator target buffers require a deferred operation source");this._targetBuffer={buffer:e,byteOffset:t,byteStride:r}}async evaluate(e,t={}){if(this._destroyed)throw new Error(`GPUDataEvaluator ${this} already destroyed`);if(this._gpuVector)return this._gpuVector;let r;if(this.source instanceof W){const i=await this.source.evaluate(e);return this._gpuVector=this.createGPUVectorView({...t,buffer:Mr(i)}),this._gpuVector}if(r=this._getEvaluationBuffer(e),this._value)r.write(this._value);else{const i=await this.source.execute(e,r);if(!i.success)throw i.error||new Error(`${this.source} evaluation failed`);i.value&&(this._value=i.value)}return this._gpuVector=this.createGPUVectorView({...t,buffer:r}),this._gpuVector}evaluateSync(e,t={}){if(this._destroyed)throw new Error(`GPUDataEvaluator ${this} already destroyed`);if(this._gpuVector)return this._gpuVector;let r;if(this.source instanceof W){const i=this.source.evaluateSync(e);return this._gpuVector=this.createGPUVectorView({...t,buffer:Mr(i)}),this._gpuVector}if(r=this._getEvaluationBuffer(e),this._value)r.write(this._value);else{const i=this.source.executeSync(e,r);if(!i.success)throw i.error||new Error(`${this.source} evaluation failed`);i.value&&(this._value=i.value)}return this._gpuVector=this.createGPUVectorView({...t,buffer:r}),this._gpuVector}createGPUVectorView(e){const t=e.name??this._id??"vector",r=e.format??this.format??z3(this.type,this.size,this.normalized);if(e.interleaved){const i=typeof e.interleaved=="object"&&e.interleaved.attributes?e.interleaved.attributes:G3(this);return new An({type:"interleaved",name:t,buffer:e.buffer,format:e.format??this.format,length:this.length,byteOffset:this.offset,byteStride:this.stride,attributes:i,ownsBuffer:!1})}return new An({type:"buffer",name:t,buffer:e.buffer,format:r,length:this.length,stride:this.size,byteOffset:this.offset,byteStride:this.stride,rowByteLength:this.ValueType.BYTES_PER_ELEMENT*this.size,ownsBuffer:!1})}_getEvaluationBuffer(e){const t=this._targetBuffer;if(!t)return Ee.createOrReuse(e,this.byteLength);if(t.buffer.device!==e)throw new Error("GPUDataEvaluator target buffer belongs to a different device");const r=this.ValueType.BYTES_PER_ELEMENT*this.size,i=this.length===0?0:(this.length-1)*t.byteStride+r;if(t.byteOffset+i>t.buffer.byteLength)throw new Error("GPUDataEvaluator target buffer is too small for the output layout");return this._offset=t.byteOffset,this._stride=t.byteStride,this._byteLength=i,this._bufferOwnership="borrowed",this._targetBuffer=void 0,t.buffer}async readValue(e=0,t){const{ValueType:r}=this,{size:i,offset:s,stride:o,length:a}=this,c=r.BYTES_PER_ELEMENT*i;if(t=t??a,e=Math.max(0,Math.min(a,e)),t=Math.max(e,Math.min(a,t)),this._value)return k3(this,this._value,e,t);const l=t-e;if(l===0)return new r(0);const u=s+e*o,d=o===c?l*c:(l-1)*o+c,h=await this.buffer.readAsync(u,d),m=new r(h.buffer,h.byteOffset,h.byteLength/r.BYTES_PER_ELEMENT);if(o===c)return m;const p=new Uint8Array(c*l);for(let g=0;g<l;g++){const b=g*o;p.set(h.subarray(b,b+c),g*c)}return new r(p.buffer)}async ensureCPUValue(){const e=this.value;if(e)return e;const t=await this.buffer.readAsync(0,this.offset+this.byteLength);if(t.byteLength%this.ValueType.BYTES_PER_ELEMENT!==0)throw new Error(`${this} backing buffer byte length is not aligned to its scalar type`);const r=t.slice();return this._value=new this.ValueType(r.buffer,r.byteOffset,r.byteLength/this.ValueType.BYTES_PER_ELEMENT),this._value}ensureCPUValueSync(){const e=this.value;if(e)return e;throw new Error(`${this} CPU value is not available for synchronous evaluation`)}toString(){var e;return this._id??((e=this.source)==null?void 0:e.toString())??this.constructor.name}destroy(){this._gpuVector&&(this._bufferOwnership==="owned"&&Ee.recycle(Mr(this._gpuVector)),this._gpuVector=void 0),this._targetBuffer=void 0,this._destroyed=!0}}function k3(n,e,t,r){const{ValueType:i,size:s,offset:o,stride:a}=n,c=a/i.BYTES_PER_ELEMENT,l=o/i.BYTES_PER_ELEMENT,u=r-t;if(c===s){const h=l+t*c;return e.subarray(h,h+u*s)}const d=new i(u*s);for(let h=0;h<u;h++){const m=l+(t+h)*c;d.set(e.subarray(m,m+s),h*s)}return d}function ru(n){if(n instanceof W)return n;if(typeof n=="number"||Array.isArray(n))return W.fromConstant(n);if(n instanceof Ko)return W.fromGPUData(n);if(n instanceof ai)return W.fromGPUDataView(n);throw new Error("getGPUDataEvaluator() requires GPUDataEvaluator, GPUData, GPUDataView, number, or number[]")}function $3(n){if(!n.format)throw new Error("GPUDataEvaluator.fromGPUData() requires GPUData format metadata");if(fh(n.format)||dh(n.format))throw new Error("GPUDataEvaluator.fromGPUData() does not support variable-length input");const t=er(n.format).byteLength;if(n.rowByteLength!==t)throw new Error(`GPUDataEvaluator.fromGPUData() requires rowByteLength ${t} for GPUData`)}function iu(n){const e=er(n.format),t=_n(e.signedDataType),r=t.BYTES_PER_ELEMENT*e.components;if(e.byteLength!==r)throw new Error(`GPUDataEvaluator does not support packed vertex format ${n.format}: ${e.byteLength} physical bytes cannot expose ${e.components} ${e.signedDataType} components`);if(n.byteOffset%t.BYTES_PER_ELEMENT!==0||n.byteStride%t.BYTES_PER_ELEMENT!==0)throw new Error(`GPUDataEvaluator requires ${n.format} offset and stride aligned to ${t.BYTES_PER_ELEMENT} bytes`);return{type:e.signedDataType,size:e.components,offset:n.byteOffset,stride:n.byteStride,normalized:e.normalized,length:n.length,format:n.format}}function Mr(n){const e=V3(n).buffer;return e instanceof ue?e.buffer:e}function V3(n){const[e,...t]=n.data;if(!e||t.length>0)throw new Error(`GPUDataEvaluator requires exactly one GPUData chunk for "${n.name}"`);return e}function G3(n){const e=[];return hh(n,e,{byteOffset:0}),e}function hh(n,e,t){const r=n.source;if(r&&!(r instanceof W)&&r.name==="interleave"){for(const i of Object.values(r.inputs))i instanceof W&&hh(i,e,t);return}e.push({attribute:n.id??n.toString(),format:mh(n.type,n.size,n.normalized),byteOffset:t.byteOffset}),t.byteOffset+=n.ValueType.BYTES_PER_ELEMENT*n.size}function mh(n,e,t=!1){if(e<1||e>4)throw new Error(`Cannot synthesize a GPUVector vertex format with ${e} components`);let r=n;if(t)switch(n){case"uint8":r="unorm8";break;case"sint8":r="snorm8";break;case"uint16":r="unorm16";break;case"sint16":r="snorm16";break;case"float32":r="float32";break;default:throw new Error(`Unsupported normalized vertex format for ${n}`)}return(r==="uint8"||r==="sint8"||r==="uint16"||r==="sint16"||r==="unorm8"||r==="snorm8"||r==="unorm16"||r==="snorm16")&&e===3?`${r}x3-webgl`:`${r}${e===1?"":`x${e}`}`}function z3(n,e,t=!1){return e>=1&&e<=4?mh(n,e,t):void 0}class Ft{constructor({id:e,gpuDataEvaluators:t,gpuVector:r,format:i}){f(this,"gpuDataEvaluators");f(this,"format");f(this,"length");f(this,"id");f(this,"_gpuVector");f(this,"_ownsGPUDataEvaluators");f(this,"_destroyed",!1);if(t.length===0)throw new Error("GPUVectorEvaluator requires at least one GPUData evaluator");W3(t),this.id=e,this.gpuDataEvaluators=t,this.format=i??t[0].format,this.length=t.reduce((s,o)=>s+o.length,0),this._gpuVector=r,this._ownsGPUDataEvaluators=!r}static fromGPUVector(e){if(e.bufferLayout)throw new Error(`GPUVectorEvaluator.fromGPUVector() does not accept interleaved vector "${e.name}"`);if(e.data.length===0)throw new Error(`GPUVectorEvaluator.fromGPUVector() requires GPUData for "${e.name}"`);return new Ft({id:e.name,gpuDataEvaluators:e.data.map(t=>W.fromGPUData(t,{id:e.name})),gpuVector:e,format:e.format})}static fromGPUDataEvaluators(e,t={}){return new Ft({id:t.id,gpuDataEvaluators:e,format:t.format})}get evaluated(){return!!this._gpuVector}get gpuVector(){if(!this._gpuVector)throw new Error(`${this} not evaluated`);return this._gpuVector}mapGPUData(e){return Ft.fromGPUDataEvaluators(this.gpuDataEvaluators.map((t,r)=>e(t,r)),{id:this.id})}async evaluate(e,t={}){if(this._destroyed)throw new Error(`GPUVectorEvaluator ${this} already destroyed`);if(this._gpuVector)return this._gpuVector;const r=await Promise.all(this.gpuDataEvaluators.map(a=>a.evaluate(e,t))),i=r[0],s=r.map(su),o=t.format??this.format??i.format;return this._gpuVector=new An({type:"data",name:t.name??this.id??"vector",format:o,data:s,stride:i.stride,byteStride:i.byteStride,rowByteLength:i.rowByteLength,bufferLayout:i.bufferLayout}),this._gpuVector}evaluateSync(e,t={}){if(this._destroyed)throw new Error(`GPUVectorEvaluator ${this} already destroyed`);if(this._gpuVector)return this._gpuVector;const r=this.gpuDataEvaluators.map(a=>a.evaluateSync(e,t)),i=r[0],s=r.map(su),o=t.format??this.format??i.format;return this._gpuVector=new An({type:"data",name:t.name??this.id??"vector",format:o,data:s,stride:i.stride,byteStride:i.byteStride,rowByteLength:i.rowByteLength,bufferLayout:i.bufferLayout}),this._gpuVector}destroy(){if(this._ownsGPUDataEvaluators)for(const e of this.gpuDataEvaluators)e.destroy();this._gpuVector=void 0,this._destroyed=!0}toString(){return this.id??this.constructor.name}}function W3(n){const e=n[0];for(const t of n.slice(1))if(t.type!==e.type||t.size!==e.size||t.normalized!==e.normalized||t.format!==e.format)throw new Error("GPUVectorEvaluator requires matching GPUData evaluator layouts")}function su(n){const[e,...t]=n.data;if(!e||t.length>0)throw new Error(`GPUVectorEvaluator requires one GPUData chunk for "${n.name}"`);return e}const Xa={add:{arity:2,symbol:"arithmetic_add"},subtract:{arity:2,symbol:"arithmetic_subtract"},multiply:{arity:2,symbol:"arithmetic_multiply"},divide:{arity:2,symbol:"arithmetic_divide"},pow:{arity:2,symbol:"pow"},sqrt:{arity:1,symbol:"sqrt"},abs:{arity:1,symbol:"abs"},sin:{arity:1,symbol:"sin"},cos:{arity:1,symbol:"cos"},tan:{arity:1,symbol:"arithmetic_tan"},exp:{arity:1,symbol:"exp"},log:{arity:1,symbol:"log"}};function Ka({elementWise:n,func:e,inputs:t,output:r,outputBuffer:i}){const s=Array.isArray(t)?t:Object.values(t);for(const p of s)if(!p.value)throw new Error(`${p} does not have CPU value`);const o=r.length,a=r.size,c=new r.ValueType(o*a);for(let p=0;p<o;p++){const g=s.map(b=>de(b,p));if(n)for(let b=0;b<a;b++)c[p*a+b]=e.apply(null,g.map(_=>_[b]));else e.call(null,c.subarray(p*a,p*a+a),...g)}const l=r.ValueType.BYTES_PER_ELEMENT,u=r.offset/l,d=r.stride/l,h=a;let m=c;if(u!==0||d!==h){m=new r.ValueType(u+r.byteLength/l);for(let p=0;p<o;p++){const g=p*h,b=u+p*d,_=c.subarray(g,g+a);m.set(_,b),i.write(_,b*l)}}else i.write(c);return{success:!0,value:m}}function de(n,e){const t=n.value,r=n.size,i=n.offset/n.ValueType.BYTES_PER_ELEMENT,s=n.stride/n.ValueType.BYTES_PER_ELEMENT,o=n.isConstant?0:e,a=i+o*s,c=t.slice(a,a+r);if(!n.normalized)return c;const l=new Float32Array(r);for(let u=0;u<r;u++)l[u]=H3(c[u],n.type);return l}function H3(n,e){switch(e){case"uint8":return n/255;case"uint16":return n/65535;case"uint32":return n/4294967295;case"sint8":return Math.max(n/127,-1);case"sint16":return Math.max(n/32767,-1);case"sint32":return Math.max(n/2147483647,-1);case"float32":return n;default:throw new Error(`Unsupported normalized source type ${e}`)}}const j3=({inputs:n,output:e,target:t})=>{for(const i of Object.values(n.namedInputs))if(!i.value)throw new Error(`${i} does not have CPU value`);const r=new e.ValueType(e.length*e.size);for(let i=0;i<e.length;i++){const s=Object.fromEntries(Object.entries(n.namedInputs).map(([o,a])=>[o,de(a,i)]));for(let o=0;o<e.size;o++)r[i*e.size+o]=ph(n.expression,s,o)}return t.write(r),{success:!0,value:r}};function ph(n,e,t){switch(n.kind){case"input":{const r=e[n.name];return t<r.length?r[t]:r.length===1?r[0]:0}case"literal":return Array.isArray(n.value)?n.value[t]??0:n.value;case"call":{X3(n.op,n.args.length);const r=n.args.map(i=>ph(i,e,t));switch(n.op){case"add":return r[0]+r[1];case"subtract":return r[0]-r[1];case"multiply":return r[0]*r[1];case"divide":return r[0]/r[1];case"pow":return Math.pow(r[0],r[1]);case"sqrt":return Math.sqrt(r[0]);case"abs":return Math.abs(r[0]);case"sin":return Math.sin(r[0]);case"cos":return Math.cos(r[0]);case"tan":return Math.tan(r[0]);case"exp":return Math.exp(r[0]);case"log":return Math.log(r[0]);default:{const i=n.op;throw new Error(`Unsupported arithmetic op ${i}`)}}}default:{const r=n;throw new Error(`Unsupported expression node ${r.kind}`)}}}function X3(n,e){const t=Xa[n].arity;if(e!==t)throw new Error(`Arithmetic op '${n}' expects ${t} args, got ${e}`)}const K3=({inputs:n,output:e,target:t})=>{const{sourceValues:r}=n;if(!r.value)throw new Error(`${r} does not have CPU value`);const s=new e.ValueType(e.length*e.size);if(r.length===0)return{success:!1,error:new Error(`${r} is empty`)};for(let o=0;o<r.size;o++){const a=de(r,0)[o],c=o*e.size,l=c+1;s[c]=a,s[l]=a;for(let u=1;u<r.length;u++){const d=de(r,u)[o];d<s[c]&&(s[c]=d),d>s[l]&&(s[l]=d)}}return t.write(s),{success:!0,value:s}},q3=({inputs:n,output:e,target:t})=>Ka({func:(r,i)=>{const s=r.length/2,o=new Float64Array(i.buffer);for(let a=0;a<s;a++){const c=o[a];r[a]=Math.fround(c),r[a+s]=c-r[a]}return r},inputs:n,output:e,outputBuffer:t}),Y3=async({inputs:n,output:e,target:t})=>{const{ids:r,sourceValues:i}=n,s=r.value,o=i.value;if(!s)throw new Error(`${r} does not have CPU value`);if(!o)throw new Error(`${i} does not have CPU value`);const a=new e.ValueType(e.length*e.size),c=new Array(e.size).fill(0);for(let l=0;l<e.length;l++){const u=de(r,l),d=Number(u[0]),h=Q3(d,i.length)?de(i,d):c;a.set(h,l*e.size)}return t.write(a),{success:!0,value:a}};function Q3(n,e){return Number.isInteger(n)&&n>=0&&n<e}const Z3=({inputs:n,output:e,target:t})=>Ka({func:(r,...i)=>{let s=0;for(const o of i)r.set(o,s),s+=o.length},inputs:n,output:e,outputBuffer:t}),J3=({inputs:n,output:e,target:t})=>{const{x:r,y:i}=n,s=new e.ValueType(e.length);for(let o=0;o<e.length;o++){const a=de(r,o),c=de(i,o);let l=0;for(let u=0;u<r.size;u++)l+=a[u]*c[u];s[o]=l}return t.write(s),{success:!0,value:s}},e2=({inputs:n,output:e,target:t})=>{const{x:r,y:i}=n,s=new e.ValueType(e.length);for(let o=0;o<e.length;o++){const a=de(r,o),c=de(i,o);let l=1;for(let u=0;u<r.size;u++)if(a[u]!==c[u]){l=0;break}s[o]=l}return t.write(s),{success:!0,value:s}},t2=({inputs:n,output:e,target:t})=>{const{x:r}=n,i=new e.ValueType(e.length);for(let s=0;s<e.length;s++){const o=de(r,s);let a=0;for(let c=0;c<r.size;c++)a+=o[c]*o[c];i[s]=Math.sqrt(a)}return t.write(i),{success:!0,value:i}},n2=async({inputs:n,output:e,target:t})=>{const{segments:r,vertexCount:i}=n,s=r.value;if(!s)throw new Error(`${r} does not have CPU value`);r2(s,r,i);const o=new e.ValueType(e.length*e.size);let a=0;for(let c=0;c<i;c++){for(;a+1<r.length&&s[qo(r,a+1)]<=c;)a++;const l=s[qo(r,a)],u=c*e.size;o[u]=a,o[u+1]=c-l}return t.write(o),{success:!0,value:o}};function r2(n,e,t){if(e.length<1)throw new Error("segmentedMap segments must contain at least one segment start");let r=0;for(let i=0;i<e.length;i++){const s=n[qo(e,i)];if(i===0&&s!==0)throw new Error(`segmentedMap segments must start at 0, got ${s}`);if(i>0&&s<r)throw new Error(`segmentedMap segments must be non-decreasing, got ${s} after ${r}`);r=s}if(r>t)throw new Error(`segmentedMap last segment start must be <= vertexCount, got ${r} > ${t}`)}function qo(n,e){return n.offset/n.ValueType.BYTES_PER_ELEMENT+e*(n.stride/n.ValueType.BYTES_PER_ELEMENT)}const i2=async({inputs:n,output:e,target:t})=>{const{condition:r,whenTrue:i,whenFalse:s}=n,o=new e.ValueType(e.length*e.size);for(let a=0;a<e.length;a++){const c=de(r,a),l=de(i,a),u=de(s,a);for(let d=0;d<e.size;d++){const h=$s(c,r.size,d);o[a*e.size+d]=h!==0?$s(l,i.size,d):$s(u,s.size,d)}}return t.write(o),{success:!0,value:o}};function $s(n,e,t){return t<e?n[t]:e===1?n[0]:0}const s2=({inputs:n,output:e,target:t})=>{const r=new e.ValueType(e.length);for(let i=0;i<e.length;i++)r[i]=n.start+i*n.step;return t.write(r),{success:!0,value:r}},o2=({inputs:n,output:e,target:t})=>{const{columns:r}=n;return Ka({func:(i,s)=>{for(let o=0;o<r.length;o++)i[o]=s[r[o]]},inputs:{x:n.x},output:e,outputBuffer:t})},a2=Object.freeze(Object.defineProperty({__proto__:null,arithmetic:j3,dot:J3,equalAll:e2,extent:K3,fround:q3,gather:Y3,interleave:Z3,length:t2,segmentedMap:n2,select:i2,sequence:s2,swizzle:o2},Symbol.toStringTag,{value:"Module"}));class c2{constructor(){f(this,"_modules",{cpu:a2})}add(e,t){const r=this._modules[e];if(typeof t.then=="function"){const s=Promise.all([Promise.resolve(r||{}),t]).then(([o,a])=>({...o,...a}));return this._modules[e]=s,s.then(o=>{this._modules[e]=o}).catch(o=>{S.error(`Failed to register ${e} backend: ${o}`)()}),s}if(r&&typeof r.then=="function"){const s=Promise.resolve(r).then(o=>({...o,...t})).then(o=>(this._modules[e]=o,o)).catch(o=>{throw S.error(`Failed to register ${e} backend: ${o}`)(),o});return this._modules[e]=s,s}const i={...r||{},...t};return this._modules[e]=i,Promise.resolve(i)}async get(e,t){let r=this._modules[e];if(!r)if(e==="webgl")r=this.add("webgl",Bn(()=>Promise.resolve().then(()=>HC),void 0));else if(e==="webgpu")r=this.add("webgpu",Bn(()=>Promise.resolve().then(()=>sA),void 0));else throw new Error(`${e} backend not registered`);const s=(await r)[t];if(typeof s!="function")throw new Error(`${e} backend does not implement ${t}`);return s}getSync(e,t){const r=this._modules[e];if(!r)throw new Error(`${e} backend not registered`);if(typeof r.then=="function")throw new Error(`${e} backend is not loaded yet`);const s=r[t];if(typeof s!="function")throw new Error(`${e} backend does not implement ${t}`);return s}clear(){this._modules={}}}const ou=new c2;class l2{constructor(e){f(this,"inputs");f(this,"dependencies");this.inputs=e,this.dependencies=Array.from(e instanceof Array?e:Object.values(e)).filter(t=>t instanceof W)}async execute(e,t){return await this._resolveDependencies(e),await this._executeWithHandler(await ou.get(this._getHandlerRegistry(e),this.name),t)}executeSync(e,t){this._resolveDependenciesSync(e);const r=this._executeWithHandler(ou.getSync(this._getHandlerRegistry(e),this.name),t);if(u2(r))throw new Error(`${this.name} returned a Promise in executeSync()`);return r}shouldExecuteOnCPU(){return this.output.length<=1&&Array.from(this.dependencies).every(e=>!!e.value)}_getHandlerRegistry(e){return this.shouldExecuteOnCPU()?"cpu":e.type}async _resolveDependencies(e){for(const r of this.dependencies)await r.evaluate(e);if(this._getHandlerRegistry(e)==="cpu"||e.type==="null")for(const r of this.dependencies)await r.ensureCPUValue()}_resolveDependenciesSync(e){for(const r of this.dependencies)r.evaluateSync(e);if(this._getHandlerRegistry(e)==="cpu"||e.type==="null")for(const r of this.dependencies)r.ensureCPUValueSync()}_executeWithHandler(e,t){return e({device:t.device,inputs:this.inputs,output:this.output,target:t})}}function u2(n){return typeof(n==null?void 0:n.then)=="function"}function gh(n,{operations:e,inputs:t}){switch(n.kind){case"input":if(!(n.name in t))throw new Error(`Unknown expression input '${n.name}'`);return;case"literal":if(Array.isArray(n.value)){for(const r of n.value)if(!Number.isFinite(r))throw new Error(`Expression literal array must contain only finite values, got ${r}`)}else if(!Number.isFinite(n.value))throw new Error(`Expression literal must be finite, got ${n.value}`);return;case"call":{const r=e[n.op];if(!r)throw new Error(`Unknown expression op '${n.op}'`);if(n.args.length!==r.arity)throw new Error(`Expression op '${n.op}' expects ${r.arity} args, got ${n.args.length}`);for(const i of n.args)gh(i,{operations:e,inputs:t});return}default:{const r=n;throw new Error(`Unsupported expression node ${r.kind}`)}}}function bh(n,e){return gh(n,e),_h(n,e)}function _h(n,e){switch(n.kind){case"input":{const t=e.inputs[n.name];return e.laneIndex<t.size?e.formatInput(n.name):e.formatOutOfBoundsInput(n.name)}case"literal":return e.formatLiteral(n.value);case"call":{const t=e.operations[n.op],r=n.args.map(i=>_h(i,e));return e.formatCall(t.symbol,r)}default:{const t=n;throw new Error(`Unsupported expression node ${t.kind}`)}}}function f2(...n){let e=d2(n.map(t=>t.type));return e[0]!=="f"&&n.some(t=>t.normalized)&&(e="float32"),{isConstant:n.every(t=>t.isConstant),type:e,size:n.reduce((t,r)=>Math.max(t,r.size),0),length:n.reduce((t,r)=>Math.max(t,r.length),0)}}function d2(n){let e=0,t=0;for(const r of n){if(r[0]==="f")return"float32";const i=r.endsWith("8")?8:r.endsWith("6")?16:32;r[0]==="u"?e=Math.max(e,i):t=Math.max(t,i)}return e&&!t?`uint${e}`:t&&e<32?`sint${Math.max(t,e*2)}`:"float32"}class h2 extends l2{constructor(t){super(t);f(this,"name","interleave");f(this,"output");const{isConstant:r,type:i,length:s}=f2(...t);this.output=new W({isConstant:r,type:i,size:t.reduce((o,a)=>o+a.size,0),length:s,source:this})}toString(){return`_${this.inputs.join("_")}_`}}function wP(...n){if(n.length===0)throw new Error("interleave() requires at least one input");return n.length===1?ru(n[0]):new h2(n.map(ru)).output}function TP(n,e){const t=p2(e);for(const r of t)r.evaluateSync(n);return m2(t),e}function m2(n){const e=new Set(n.flatMap(b2)),t=new Set;for(const r of n)$r(r,t);for(const r of t)r.evaluated&&!e.has(r.buffer)&&r.destroy()}function p2(n){const e=new Set;return Yo(n,e,new Set),Array.from(e)}function Yo(n,e,t){if(_2(n)){e.add(n);return}if(!(!n||typeof n!="object"||t.has(n))){if(t.add(n),Array.isArray(n)){for(const r of n)Yo(r,e,t);return}if(g2(n))for(const r of Object.values(n))Yo(r,e,t)}}function g2(n){const e=Object.getPrototypeOf(n);return e===Object.prototype||e===null}function $r(n,e){if(n instanceof Ft){for(const r of n.gpuDataEvaluators)$r(r,e);return}const t=n.source;if(t){if(t instanceof W){e.has(t)||(e.add(t),$r(t,e));return}for(const r of t.dependencies)e.has(r)||(e.add(r),$r(r,e))}}function b2(n){return n instanceof W?[n.buffer]:n.gpuVector.data.map(e=>e.buffer instanceof ue?e.buffer.buffer:e.buffer)}function _2(n){return n instanceof W||n instanceof Ft}const y2=65535;function tr(n,e){const t=v2(e),r=Math.max(1,Math.ceil(n)),i=Math.min(r,t),s=Math.min(Math.ceil(r/i),t),o=Math.ceil(r/i/s);if(o>t)throw new Error(`WebGPU dispatch requires ${r} workgroups, exceeding the 3D dispatch limit of ${t} per dimension`);return{x:i,y:s,z:o}}function yh(n,e="workgroupId"){return`((${e}.z * ${n.y}u + ${e}.y) * ${n.x}u + ${e}.x)`}function Vi(n,e,t="workgroupId",r="localId"){return`(${yh(n,t)} * ${e}u + ${r}.x)`}function v2(n){return Number.isFinite(n)&&n>0?Math.floor(n):y2}function zn(n,e){switch(n){case"u32":return`${e}u`;case"f32":return Number.isInteger(e)?`${e}.0`:`${e}`;default:return`${e}`}}function x2(n,e){switch(n){case"uint32":return zn("u32",Math.trunc(e));case"sint32":return`${Math.trunc(e)}`;case"float32":return zn("f32",e);default:throw new Error(`WebGPU operations only support 32-bit output types, got ${n}`)}}function Gi(n){switch(n){case"uint32":return"0u";case"sint32":return"0";case"float32":return"0.0";default:throw new Error(`WebGPU operations only support 32-bit output types, got ${n}`)}}function q(n){switch(n){case"uint32":return"u32";case"sint32":return"i32";case"float32":return"f32";default:throw new Error(`WebGPU operations only support 32-bit storage types, got ${n}`)}}const Vs=64,S2="GPGPU Operation Counts",w2="Computation Runs",T2=new zt;function nt({module:n,elementWise:e=!1,expression:t,inputs:r,output:i,operationType:s=i.type,outputBuffer:o}){if(!n.source)throw new Error(`WebGPU computation ${n.name} requires WGSL source`);const a=L2(r),c=a.map(([y,v])=>({name:y,input:v})),l=c.filter(({input:y})=>!y.isConstant).map((y,v)=>({...y,index:v})),u=q(s),d=q(i.type),h={TYPE:u,RESULT_LEN:i.size.toString()},m=tr(Math.ceil(i.length/Vs),o.device.limits.maxComputeWorkgroupsPerDimension);for(const[y,v]of a)h[`${y.toUpperCase()}_LEN`]=v.size.toString();const p=`
${P2(n.source,h)}
${l.map(({name:y,input:v,index:w})=>E2(y,v,w)).join(`
`)}
${c.map(({name:y,input:v})=>A2(y,v,s)).join(`
`)}
${R2(i,l.length)}
${I2(i)}

@compute @workgroup_size(${Vs}) fn main(
  @builtin(workgroup_id) workgroupId: vec3<u32>,
  @builtin(local_invocation_id) localId: vec3<u32>
) {
  let rowIndex = ${Vi(m,Vs)};
  if (rowIndex >= ${i.length}u) {
    return;
  }

${c.map(({name:y})=>`  let ${y} = read_${y}(rowIndex);`).join(`
`)}
  var result: array<${d}, ${i.size}>;
${M2(n.name,a,i,e,t)}
  write_result(rowIndex, result);
}
`,g=new gt(o.device,{source:p,modules:n.dependencies,shaderAssembler:T2,shaderLayout:{bindings:[...l.map(({name:y},v)=>({name:y,type:"storage",group:0,location:v})),{name:"result",type:"storage",group:0,location:l.length}]}}),b=Object.fromEntries(l.map(({name:y,input:v})=>[y,v.buffer]));b.result=o,g.setBindings(b);const _=o.device.beginComputePass({});o.device.statsManager.getStats(S2).get(w2).incrementCount(),g.dispatch(_,m.x,m.y,m.z),_.end(),o.device.submit(),g.destroy()}function E2(n,e,t){if(e.isConstant)return"";const r=q(e.type);return`@group(0) @binding(${t}) var<storage, read> ${n}: array<${r}>;`}function A2(n,e,t){const r=q(t),i=e.type===t?"":r,s=e.stride/e.ValueType.BYTES_PER_ELEMENT,o=e.offset/e.ValueType.BYTES_PER_ELEMENT;return e.isConstant?`fn read_${n}(_rowIndex: u32) -> array<${r}, ${e.size}> {
  return array<${r}, ${e.size}>(${C2(e,i)});
}`:`fn read_${n}(rowIndex: u32) -> array<${r}, ${e.size}> {
  var value: array<${r}, ${e.size}>;
  let rowOffset = ${o}u + rowIndex * ${s}u;
${Array.from({length:e.size},(a,c)=>i?`  value[${c}] = ${i}(${n}[rowOffset + ${c}u]);`:`  value[${c}] = ${n}[rowOffset + ${c}u];`).join(`
`)}
  return value;
}`}function R2(n,e){const t=q(n.type);return`@group(0) @binding(${e}) var<storage, read_write> result: array<${t}>;`}function I2(n){const e=n.stride/n.ValueType.BYTES_PER_ELEMENT,t=n.offset/n.ValueType.BYTES_PER_ELEMENT;return`fn write_result(rowIndex: u32, value: array<${q(n.type)}, ${n.size}>) {
  let rowOffset = ${t}u + rowIndex * ${e}u;
${Array.from({length:n.size},(i,s)=>`  result[rowOffset + ${s}u] = value[${s}];`).join(`
`)}
}`}function M2(n,e,t,r,i){let s="";if(i)for(let o=0;o<t.size;o++)s+=`  result[${o}] = ${i(o)};
`;else if(r){const o=Gi(t.type),a=q(t.type);for(let c=0;c<t.size;c++){const l=e.map(([u,d])=>c<d.size?q(d.type)===a?`${u}[${c}]`:`${a}(${u}[${c}])`:o);s+=`  result[${c}] = ${n}(${l.join(", ")});
`}}else s+=`result = ${n}(${e.map(([o])=>o).join(", ")});`;return s.trimEnd()}function L2(n){return Array.isArray(n)?n.map((e,t)=>[`x${t}`,e]):Object.entries(n)}function C2(n,e){const t=n.value;if(!t)throw new Error(`Constant input ${n} is missing CPU values`);return Array.from({length:n.size},(r,i)=>zn(e,t[i]??0)).join(", ")}function P2(n,e){for(const t in e)n=n.replaceAll(`{${t}}`,e[t]);return n}const B2=`fn arithmetic_add(x: {TYPE}, y: {TYPE}) -> {TYPE} {
  return x + y;
}

fn arithmetic_subtract(x: {TYPE}, y: {TYPE}) -> {TYPE} {
  return x - y;
}

fn arithmetic_multiply(x: {TYPE}, y: {TYPE}) -> {TYPE} {
  return x * y;
}

fn arithmetic_divide(x: {TYPE}, y: {TYPE}) -> {TYPE} {
  return x / y;
}

fn arithmetic_tan(x: f32) -> f32 {
  return tan_fp32(x);
}
`,N2=({inputs:n,output:e,target:t})=>{const r=e.type,i=q(r),s=Gi(r),o=n.namedInputs;return nt({module:{name:"arithmetic",source:B2,dependencies:[xd]},inputs:o,output:e,operationType:r,outputBuffer:t,expression:a=>bh(n.expression,{operations:Xa,inputs:o,laneIndex:a,formatInput:c=>`${c}[${a}]`,formatOutOfBoundsInput:c=>o[c].size===1?`${c}[0]`:s,formatLiteral:c=>{const l=Array.isArray(c)?c[a]??0:c;return`${i}(${x2(r,l)})`},formatCall:(c,l)=>`${c}(${l.join(", ")})`})}),{success:!0}},O2=`fn row_dot(x: array<{TYPE}, {X_LEN}>, y: array<{TYPE}, {Y_LEN}>) -> array<f32, 1> {
  var sum = 0.0;
  for (var i = 0u; i < {X_LEN}u; i = i + 1u) {
    sum += f32(x[i]) * f32(y[i]);
  }
  return array<f32, 1>(sum);
}
`,F2=({inputs:n,output:e,target:t})=>(nt({module:{name:"row_dot",source:O2},inputs:n,output:e,operationType:"float32",outputBuffer:t}),{success:!0}),U2=`fn equalAll(x: array<{TYPE}, {X_LEN}>, y: array<{TYPE}, {Y_LEN}>) -> array<u32, 1> {
  var allEqual = 1u;
  for (var i = 0u; i < {X_LEN}u; i = i + 1u) {
    if (x[i] != y[i]) {
      allEqual = 0u;
      break;
    }
  }
  return array<u32, 1>(allEqual);
}
`,D2=({inputs:n,output:e,target:t})=>(nt({module:{name:"equalAll",source:U2},inputs:n,output:e,operationType:n.x.type,outputBuffer:t}),{success:!0}),_e=64;function qa(n,e,t){const r=q(e.type);return`@group(0) @binding(${t}) var<storage, read> ${n}: array<${r}>;`}function vh(n,e,t,r=n){const i=q(t);if(e.isConstant){const l=e.value;if(!l)throw new Error(`Constant input ${e} is missing CPU values`);return`fn read_${r}(_sourceIndex: u32) -> array<${i}, ${e.size}> {
  return array<${i}, ${e.size}>(${Array.from({length:e.size},(u,d)=>zn(i,l[d]??0)).join(", ")});
}`}const s=e.stride/e.ValueType.BYTES_PER_ELEMENT,o=e.offset/e.ValueType.BYTES_PER_ELEMENT,c=q(e.type)===i?"":`${i}`;return`fn read_${r}(sourceIndex: u32) -> array<${i}, ${e.size}> {
  var value: array<${i}, ${e.size}>;
  let rowOffset = ${o}u + sourceIndex * ${s}u;
${Array.from({length:e.size},(l,u)=>c?`  value[${u}] = ${c}(${n}[rowOffset + ${u}u]);`:`  value[${u}] = ${n}[rowOffset + ${u}u];`).join(`
`)}
  return value;
}`}function xh(n,e){return vh("sourceValues",n,e,"source_values")}function Ya(n,e){const t=q(n.type);return`@group(0) @binding(${e}) var<storage, read_write> result: array<${t}>;`}function Qa(n){const e=n.stride/n.ValueType.BYTES_PER_ELEMENT,t=n.offset/n.ValueType.BYTES_PER_ELEMENT;return`fn write_result(rowIndex: u32, value: array<${q(n.type)}, ${n.size}>) {
  let rowOffset = ${t}u + rowIndex * ${e}u;
${Array.from({length:n.size},(i,s)=>`  result[rowOffset + ${s}u] = value[${s}];`).join(`
`)}
}`}function k2(n,e){const t=Gi(n);return`fn zero_result() -> array<${q(n)}, ${e}> {
  var result: array<${q(n)}, ${e}>;
${Array.from({length:e},(r,i)=>`  result[${i}] = ${t};`).join(`
`)}
  return result;
}`}const $2=({inputs:n,output:e,target:t})=>{const{sourceValues:r}=n;if(r.length===0){const c=new e.ValueType(e.length*e.size);return t.write(c),{success:!0,value:c}}if(r.isConstant){const c=r.value;if(!c)throw new Error(`Constant input ${r} is missing CPU values`);const l=new e.ValueType(e.length*e.size);for(let u=0;u<e.length;u++){const d=c[u];l[u*2]=d,l[u*2+1]=d}return t.write(l),{success:!0,value:l}}const i=[];let s=r,o="raw",a=r.length;try{for(;;){const c=Math.ceil(a/_e),l=e.length*c,u=c===1?t:Ee.createOrReuse(t.device,l*e.stride);if(c>1&&i.push(u),V2({input:s,inputMode:o,inputGroupCount:a,channelCount:e.length,outputType:e.type,outputBuffer:u,outputLength:l,outputStride:e.stride,outputOffset:e.offset}),c===1)break;s=new W({buffer:u,type:e.type,size:2,length:l}),o="partial",a=c}return{success:!0}}finally{for(const c of i)Ee.recycle(c)}};function V2({input:n,inputMode:e,inputGroupCount:t,channelCount:r,outputType:i,outputBuffer:s,outputLength:o,outputStride:a,outputOffset:c}){const l=q(i),u=tr(o,s.device.limits.maxComputeWorkgroupsPerDimension),d=new W({buffer:s,type:i,size:2,length:o,stride:a,offset:c}),h=`
${n.isConstant?"":qa("sourceValues",n,0)}
${xh(n,i)}
${Ya(d,n.isConstant?0:1)}
${Qa(d)}
${G2(e,i,r,t)}

var<workgroup> sharedMin: array<${l}, ${_e}>;
var<workgroup> sharedMax: array<${l}, ${_e}>;

@compute @workgroup_size(${_e}) fn main(
  @builtin(workgroup_id) workgroupId: vec3<u32>,
  @builtin(local_invocation_id) localId: vec3<u32>
) {
  let outputRowIndex = ${yh(u)};
  if (outputRowIndex >= ${o}u) {
    return;
  }

  let channelIndex = outputRowIndex % ${r}u;
  let outputGroupIndex = outputRowIndex / ${r}u;
  let inputGroupIndex = outputGroupIndex * ${_e}u + localId.x;

  let result = extent_pass(channelIndex, inputGroupIndex);
  sharedMin[localId.x] = result[0];
  sharedMax[localId.x] = result[1];
  workgroupBarrier();

  var stride = ${Math.floor(_e/2)}u;
  loop {
    if (stride == 0u) {
      break;
    }
    if (localId.x < stride) {
      let compareIndex = localId.x + stride;
      if (sharedMin[compareIndex] < sharedMin[localId.x]) {
        sharedMin[localId.x] = sharedMin[compareIndex];
      }
      if (sharedMax[compareIndex] > sharedMax[localId.x]) {
        sharedMax[localId.x] = sharedMax[compareIndex];
      }
    }
    workgroupBarrier();
    stride = stride / 2u;
  }

  if (localId.x == 0u) {
    write_result(outputRowIndex, array<${l}, 2>(sharedMin[0], sharedMax[0]));
  }
}
`,m=new gt(s.device,{source:h,shaderLayout:{bindings:[...n.isConstant?[]:[{name:"sourceValues",type:"storage",group:0,location:0}],{name:"result",type:"storage",group:0,location:n.isConstant?0:1}]}}),p={result:s};n.isConstant||(p.sourceValues=n.buffer),m.setBindings(p);const g=s.device.beginComputePass({});m.dispatch(g,u.x,u.y,u.z),g.end(),s.device.submit(),m.destroy()}function G2(n,e,t,r){const i=q(e),[s,o]=z2(e);return n==="raw"?`fn extent_pass(channelIndex: u32, inputGroupIndex: u32) -> array<${i}, 2> {
  var result: array<${i}, 2>;
  result[0] = ${s};
  result[1] = ${o};

  if (inputGroupIndex < ${r}u) {
    let value = read_source_values(inputGroupIndex);
    result[0] = value[channelIndex];
    result[1] = value[channelIndex];
  }

  return result;
}`:`fn extent_pass(channelIndex: u32, inputGroupIndex: u32) -> array<${i}, 2> {
  var result: array<${i}, 2>;
  result[0] = ${s};
  result[1] = ${o};

  if (inputGroupIndex < ${r}u) {
    let rowIndex = inputGroupIndex * ${t}u + channelIndex;
    let value = read_source_values(rowIndex);
    result[0] = value[0];
    result[1] = value[1];
  }

  return result;
}`}function z2(n){switch(n){case"uint32":return["0xffffffffu","0u"];case"sint32":return["2147483647","-2147483648"];case"float32":return["3.402823e38","-3.402823e38"];default:throw new Error(`Unsupported WebGPU extent type for ${n}`)}}function W2(){const n=new Uint16Array([255]);return new Uint8Array(n.buffer)[0]>0}const H2=`const LE: bool = ${W2()?"true":"false"};
const F32_NAN: u32 = 0xffffffffu;
const F32_INF: u32 = 0x7f800000u;

fn roundShiftRight(value: u32, shift: i32) -> u32 {
  if (shift <= 0) {
    return value << u32(-shift);
  }

  if (shift >= 32) {
    if (shift == 32 && value > 0x80000000u) {
      return 1u;
    }
    return 0u;
  }

  let shiftU32 = u32(shift);
  let truncated = value >> shiftU32;
  let halfShift = 1u << u32(shift - 1);
  let remainder = value & ((1u << shiftU32) - 1u);
  if (remainder > halfShift || (remainder == halfShift && (truncated & 1u) == 1u)) {
    return truncated + 1u;
  }
  return truncated;
}

fn makeFloatImmediate(sign: u32, exponent: i32, mantissa: u32) -> u32 {
  return (sign << 31u) | (u32(exponent + 127) << 23u) | (mantissa & 0x7fffffu);
}

fn makeFloat(sign: u32, exponent: i32, significand: u32) -> u32 {
  if (significand == 0u) {
    return sign << 31u;
  }

  let leadingZeros = i32(countLeadingZeros(significand));
  var normalizedExponent = exponent + 31 - leadingZeros;

  if (normalizedExponent > 127) {
    return (sign << 31u) | F32_INF;
  }

  var mantissa: u32;
  if (normalizedExponent >= -126) {
    mantissa = roundShiftRight(significand, 8 - leadingZeros);
    if (mantissa >= 0x1000000u) {
      mantissa = mantissa >> 1u;
      normalizedExponent += 1;
      if (normalizedExponent > 127) {
        return (sign << 31u) | F32_INF;
      }
    }
    return makeFloatImmediate(sign, normalizedExponent, mantissa);
  }

  let subnormalShift = -149 - exponent;
  mantissa = roundShiftRight(significand, subnormalShift);
  if (mantissa >= 0x800000u) {
    return (sign << 31u) | (1u << 23u);
  }
  return (sign << 31u) | mantissa;
}

fn parseAsDouble(words: vec2<u32>) -> vec2<u32> {
  var d = words;
  if (LE) {
    d = d.yx;
  }

  let sign = (d.x >> 31u) & 1u;
  let exponentBits = (d.x >> 20u) & 0x7ffu;
  let exponent = i32(exponentBits) - 1023;
  let fractionHigh = d.x & 0xfffffu;
  let fractionLow = d.y;

  if (exponentBits == 0x7ffu) {
    if (fractionHigh == 0u && fractionLow == 0u) {
      return vec2<u32>((sign << 31u) | F32_INF, F32_NAN);
    }
    return vec2<u32>(F32_NAN);
  }

  if (exponentBits == 0u) {
    return vec2<u32>(sign << 31u);
  }

  if (exponent > 127) {
    return vec2<u32>((sign << 31u) | F32_INF, ((1u - sign) << 31u) | F32_INF);
  }

  let highSignificand = 0x800000u | (fractionHigh << 3u) | (fractionLow >> 29u);
  let lowSignificand = fractionLow & 0x1fffffffu;

  if (exponent < -126) {
    let highPart = makeFloat(sign, exponent - 23, highSignificand);
    let lowPart = makeFloat(sign, exponent - 52, lowSignificand);
    return vec2<u32>(highPart, lowPart);
  }

  let roundUp = lowSignificand > 0x10000000u ||
    (lowSignificand == 0x10000000u && (highSignificand & 1u) == 1u);

  var roundedSignificand = highSignificand + select(0u, 1u, roundUp);
  var highExponent = exponent;
  if (roundedSignificand == 0x1000000u) {
    roundedSignificand = 0x800000u;
    highExponent += 1;
  }

  if (highExponent > 127) {
    return vec2<u32>((sign << 31u) | F32_INF, ((1u - sign) << 31u) | F32_INF);
  }

  let highPart = makeFloatImmediate(sign, highExponent, roundedSignificand);

  var remainder = i32(lowSignificand);
  var lowSign = sign;
  if (roundUp) {
    remainder -= 0x20000000;
  }
  if (remainder < 0) {
    lowSign = 1u - sign;
    remainder = -remainder;
  }

  let lowPart = makeFloat(lowSign, exponent - 52, u32(remainder));
  return vec2<u32>(highPart, lowPart);
}

fn fround(x: array<u32, {X_LEN}>) -> array<f32, {RESULT_LEN}> {
  var result: array<f32, {RESULT_LEN}>;
  let n = {X_LEN}u / 2u;
  for (var i = 0u; i < n; i = i + 1u) {
    let parts = parseAsDouble(vec2<u32>(x[i * 2u], x[i * 2u + 1u]));
    result[i] = bitcast<f32>(parts.x);
    result[i + n] = bitcast<f32>(parts.y);
  }
  return result;
}
`,j2=({inputs:n,output:e,target:t})=>(nt({module:{name:"fround",source:H2},inputs:n,output:e,operationType:"uint32",outputBuffer:t}),{success:!0}),X2=async({inputs:n,output:e,target:t})=>{const{ids:r,sourceValues:i}=n,s=q(r.type),o=[];r.isConstant||o.push({name:"ids",input:r,index:o.length}),i.isConstant||o.push({name:"sourceValues",input:i,index:o.length});const a=tr(Math.ceil(e.length/_e),t.device.limits.maxComputeWorkgroupsPerDimension),c=`
${o.map(({name:h,input:m,index:p})=>qa(h,m,p)).join(`
`)}
${K2(r,s)}
${xh(i,e.type)}
${Ya(e,o.length)}
${Qa(e)}
${k2(e.type,e.size)}
${q2(r.type,e.type,e.size,i.length)}

@compute @workgroup_size(${_e}) fn main(
  @builtin(workgroup_id) workgroupId: vec3<u32>,
  @builtin(local_invocation_id) localId: vec3<u32>
) {
  let rowIndex = ${Vi(a,_e)};
  if (rowIndex >= ${e.length}u) {
    return;
  }

  let idsValue = read_ids(rowIndex);
  let result = gather(idsValue);
  write_result(rowIndex, result);
}
`,l=new gt(t.device,{source:c,shaderLayout:{bindings:[...o.map(({name:h,index:m})=>({name:h,type:"storage",group:0,location:m})),{name:"result",type:"storage",group:0,location:o.length}]}}),u={};r.isConstant||(u.ids=r.buffer),i.isConstant||(u.sourceValues=i.buffer),u.result=t,l.setBindings(u);const d=t.device.beginComputePass({});return l.dispatch(d,a.x,a.y,a.z),d.end(),t.device.submit(),l.destroy(),{success:!0}};function K2(n,e){if(n.isConstant){const i=n.value;if(!i)throw new Error(`Constant input ${n} is missing CPU values`);return`fn read_ids(_rowIndex: u32) -> ${e} {
  return ${zn(e,i[0]??0)};
}`}const t=n.stride/n.ValueType.BYTES_PER_ELEMENT,r=n.offset/n.ValueType.BYTES_PER_ELEMENT;return`fn read_ids(rowIndex: u32) -> ${e} {
  let rowOffset = ${r}u + rowIndex * ${t}u;
  return ids[rowOffset];
}`}function q2(n,e,t,r){const i=q(n),s=q(e);return`fn gather(idsValue: ${i}) -> array<${s}, ${t}> {
  let sourceIndex = ${i==="u32"?"i32(idsValue)":i==="i32"?"idsValue":"i32(idsValue)"};
  if (sourceIndex < 0 || sourceIndex >= ${r}) {
    return zero_result();
  }
  return read_source_values(u32(sourceIndex));
}`}const Y2=async({inputs:n,output:e,target:t})=>{const{segments:r}=n,i=r.isConstant?[]:[{name:"segments",input:r,index:0}],s=tr(Math.ceil(e.length/_e),t.device.limits.maxComputeWorkgroupsPerDimension),o=`
${i.map(({name:u,input:d,index:h})=>qa(u,d,h)).join(`
`)}
${vh("segments",r,"uint32")}
${Ya(e,i.length)}
${Qa(e)}
${Q2(r.length)}

@compute @workgroup_size(${_e}) fn main(
  @builtin(workgroup_id) workgroupId: vec3<u32>,
  @builtin(local_invocation_id) localId: vec3<u32>
) {
  let rowIndex = ${Vi(s,_e)};
  if (rowIndex >= ${e.length}u) {
    return;
  }

  let result = segmented_map(rowIndex);
  write_result(rowIndex, result);
}
`,a=new gt(t.device,{source:o,shaderLayout:{bindings:[...i.map(({name:u,index:d})=>({name:u,type:"storage",group:0,location:d})),{name:"result",type:"storage",group:0,location:i.length}]}}),c=Object.fromEntries(i.map(({name:u,input:d})=>[u,d.buffer]));c.result=t,a.setBindings(c);const l=t.device.beginComputePass({});return a.dispatch(l,s.x,s.y,s.z),l.end(),t.device.submit(),a.destroy(),{success:!0}};function Q2(n){return`fn segmented_map(vertexIndex: u32) -> array<u32, 2> {
  var low = 0i;
  var high = ${n}i;
  while (low < high) {
    let mid = low + (high - low) / 2i;
    let midStart = read_segments(u32(mid))[0];
    if (midStart <= vertexIndex) {
      low = mid + 1i;
    } else {
      high = mid;
    }
  }

  let segmentIndex = u32(max(low - 1i, 0i));
  let segmentStart = read_segments(segmentIndex)[0];
  return array<u32, 2>(segmentIndex, vertexIndex - segmentStart);
}`}const Z2=({inputs:n,output:e,target:t})=>{const r=n.map((c,l)=>[`x${l}`,c]);J2(t.device.limits,r);const i=r.map(([c,l])=>`${c}: array<{TYPE}, ${l.size}>`).join(", ");let s=0;const o=r.map(([c,l])=>{const u=Array.from({length:l.size},(d,h)=>`  out[${s+h}] = ${c}[${h}];`).join(`
`);return s+=l.size,u}).join(`
`),a=`fn interleave(${i}) -> array<{TYPE}, {RESULT_LEN}> {
  var out: array<{TYPE}, {RESULT_LEN}>;
${o}
  return out;
}
`;return nt({module:{name:"interleave",source:a},inputs:n,output:e,outputBuffer:t}),{success:!0}};function J2(n,e){const r=e.filter(([,i])=>!i.isConstant).length+1;if(r>n.maxStorageBuffersPerShaderStage)throw new Error(`interleave() requires ${r} storage buffers, exceeding device limit ${n.maxStorageBuffersPerShaderStage}`);if(r>n.maxBindingsPerBindGroup)throw new Error(`interleave() requires ${r} bindings, exceeding bind group limit ${n.maxBindingsPerBindGroup}`)}const eA=`fn row_length(x: array<{TYPE}, {X_LEN}>) -> array<f32, 1> {
  var sum = 0.0;
  for (var i = 0u; i < {X_LEN}u; i = i + 1u) {
    sum += f32(x[i]) * f32(x[i]);
  }
  return array<f32, 1>(sqrt(sum));
}
`,tA=({inputs:n,output:e,target:t})=>(nt({module:{name:"row_length",source:eA},inputs:n,output:e,operationType:"float32",outputBuffer:t}),{success:!0}),nA=async({inputs:n,output:e,target:t})=>{const r=Gi(e.type);return nt({module:{name:"select",source:`// inline expression select
`},inputs:n,output:e,operationType:e.type,outputBuffer:t,expression:i=>{const s=Gs("condition",n.condition,i,r),o=Gs("whenTrue",n.whenTrue,i,r);return`select(${Gs("whenFalse",n.whenFalse,i,r)}, ${o}, ${s} != ${r})`}}),{success:!0}};function Gs(n,e,t,r){return t<e.size?`${n}[${t}]`:e.size===1?`${n}[0]`:r}const zs=64,rA=({inputs:n,output:e,target:t})=>{const r=tr(Math.ceil(e.length/zs),t.device.limits.maxComputeWorkgroupsPerDimension),i=`@group(0) @binding(0) var<storage, read_write> result: array<i32>;

@compute @workgroup_size(${zs}) fn main(
  @builtin(workgroup_id) workgroupId: vec3<u32>,
  @builtin(local_invocation_id) localId: vec3<u32>
) {
  let rowIndex = ${Vi(r,zs)};
  if (rowIndex >= ${e.length}u) {
    return;
  }

  let rowOffset = ${e.offset/e.ValueType.BYTES_PER_ELEMENT}u + rowIndex * ${e.stride/e.ValueType.BYTES_PER_ELEMENT}u;
  result[rowOffset] = ${n.start} + i32(rowIndex) * ${n.step};
}
`,s=new gt(t.device,{source:i,shaderLayout:{bindings:[{name:"result",type:"storage",group:0,location:0}]}});s.setBindings({result:t});const o=t.device.beginComputePass({});return s.dispatch(o,r.x,r.y,r.z),o.end(),t.device.submit(),s.destroy(),{success:!0}},iA=({inputs:n,output:e,target:t})=>{const{columns:r}=n;return nt({module:{name:"swizzle",source:"// swizzle expression handled inline"},expression:i=>`x[${r[i]}]`,inputs:{x:n.x},output:e,outputBuffer:t}),{success:!0}},sA=Object.freeze(Object.defineProperty({__proto__:null,arithmetic:N2,dot:F2,equalAll:D2,extent:$2,fround:j2,gather:X2,interleave:Z2,length:tA,segmentedMap:Y2,select:nA,sequence:rA,swizzle:iA},Symbol.toStringTag,{value:"Module"}));function Lr(n,e){const t=e.length,r=n.length;if(r>0){let i=!0;for(let s=0;s<t;s++)if(n[r-t+s]!==e[s]){i=!1;break}if(i)return!1}for(let i=0;i<t;i++)n[r+i]=e[i];return!0}function au(n,e){const t=e.length;for(let r=0;r<t;r++)n[r]=e[r]}function cu(n,e,t,r,i=[]){const s=r+e*t;for(let o=0;o<t;o++)i[o]=n[s+o];return i}function lu(n,e,t,r,i=[]){let s,o;if(t&8)s=(r[3]-n[1])/(e[1]-n[1]),o=3;else if(t&4)s=(r[1]-n[1])/(e[1]-n[1]),o=1;else if(t&2)s=(r[2]-n[0])/(e[0]-n[0]),o=2;else if(t&1)s=(r[0]-n[0])/(e[0]-n[0]),o=0;else return null;for(let a=0;a<n.length;a++)i[a]=(o&1)===a?r[o]:s*(e[a]-n[a])+n[a];return i}function Ws(n,e){let t=0;return n[0]<e[0]?t|=1:n[0]>e[2]&&(t|=2),n[1]<e[1]?t|=4:n[1]>e[3]&&(t|=8),t}function oA(n,e){const{size:t=2,broken:r=!1,gridResolution:i=10,gridOffset:s=[0,0],startIndex:o=0,endIndex:a=n.length}=e||{},c=(a-o)/t;let l=[];const u=[l],d=cu(n,0,t,o);let h,m;const p=aA(d,i,s,[]),g=[];Lr(l,d);for(let b=1;b<c;b++){for(h=cu(n,b,t,o,h),m=Ws(h,p);m;){lu(d,h,m,p,g);const _=Ws(g,p);_&&(lu(d,g,_,p,g),m=_),Lr(l,g),au(d,g),cA(p,i,m),r&&l.length>t&&(l=[],u.push(l),Lr(l,d)),m=Ws(h,p)}Lr(l,h),au(d,h)}return r?u:u[0]}function aA(n,e,t,r){const i=Math.floor((n[0]-t[0])/e)*e+t[0],s=Math.floor((n[1]-t[1])/e)*e+t[1];return r[0]=i,r[1]=s,r[2]=i+e,r[3]=s+e,r}function cA(n,e,t){t&8?(n[1]+=e,n[3]+=e):t&4?(n[1]-=e,n[3]-=e):t&2?(n[0]+=e,n[2]+=e):t&1&&(n[0]-=e,n[2]-=e)}function EP(n,e){const{size:t=2,startIndex:r=0,endIndex:i=n.length,normalize:s=!0}=e||{},o=n.slice(r,i);lA(o,t,0,i-r);const a=oA(o,{size:t,broken:!0,gridResolution:360,gridOffset:[-180,-180]});if(s)for(const c of a)uA(c,t);return a}function lA(n,e,t,r){let i=n[0],s;for(let o=t;o<r;o+=e){s=n[o];const a=s-i;(a>180||a<-180)&&(s-=Math.round(a/360)*360),n[o]=i=s}}function uA(n,e){let t;const r=n.length/e;for(let s=0;s<r&&(t=n[s*e],(t+180)%360===0);s++);const i=-Math.round(t/360)*360;if(i!==0)for(let s=0;s<r;s++)n[s*e]+=i}const fA=`
struct VertexInputs {
  @location(0) positions: vec3f,
#ifdef HAS_NORMALS
  @location(1) normals: vec3f,
#endif
#ifdef HAS_TANGENTS
  @location(2) TANGENT: vec4f,
#endif
#ifdef HAS_UV
  @location(3) texCoords: vec2f,
#endif
#ifdef HAS_UV_1
  @location(4) texCoords1: vec2f,
#endif
#ifdef HAS_SKIN
  @location(5) JOINTS_0: vec4u,
  @location(6) WEIGHTS_0: vec4f,
#endif
#ifdef HAS_GLTF_INSTANCING
  @location(8) instanceModelMatrixCol0: vec4f,
  @location(9) instanceModelMatrixCol1: vec4f,
  @location(10) instanceModelMatrixCol2: vec4f,
  @location(11) instanceModelMatrixCol3: vec4f,
  @builtin(instance_index) instanceIndex: u32,
#endif
#ifdef HAS_GPU_CROWD_ANIMATION
  @location(12) instanceAnimationFrames: vec4f,
  @location(13) instanceAnimationBlend: vec4f,
#endif
#ifdef HAS_INSTANCED_MORPH
  @builtin(vertex_index) vertexIndex: u32,
#endif
};

struct FragmentInputs {
  @builtin(position) position: vec4f,
  @location(0) pbrPosition: vec3f,
  @location(1) pbrUV0: vec2f,
  @location(2) pbrUV1: vec2f,
  @location(3) pbrNormal: vec3f,
#ifdef HAS_TANGENTS
  @location(4) pbrTangent: vec4f,
#endif
};

#ifdef HAS_GLTF_INSTANCING
fn getGLTFInstanceNormalMatrix(matrix: mat3x3f) -> mat3x3f {
  let firstCofactor = cross(matrix[1], matrix[2]);
  let inverseDeterminant = 1.0 / dot(matrix[0], firstCofactor);
  return mat3x3f(
    firstCofactor,
    cross(matrix[2], matrix[0]),
    cross(matrix[0], matrix[1])
  ) * inverseDeterminant;
}
#endif

@vertex
fn vertexMain(inputs: VertexInputs) -> FragmentInputs {
  var outputs: FragmentInputs;
  var position = vec4f(inputs.positions, 1.0);
  var normal = vec3f(0.0, 0.0, 1.0);
  var tangent = vec4f(1.0, 0.0, 0.0, 1.0);
  var uv0 = vec2f(0.0, 0.0);
  var uv1 = vec2f(0.0, 0.0);

#ifdef HAS_NORMALS
  normal = inputs.normals;
#endif
#ifdef HAS_UV
  uv0 = inputs.texCoords;
#endif
#ifdef HAS_UV_1
  uv1 = inputs.texCoords1;
#endif
#ifdef HAS_TANGENTS
  tangent = inputs.TANGENT;
#endif

#ifdef HAS_INSTANCED_MORPH
  var animationFrames = vec4f(0.0);
  var animationBlend = vec4f(0.0);
#ifdef HAS_GPU_CROWD_ANIMATION
  animationFrames = inputs.instanceAnimationFrames;
  animationBlend = inputs.instanceAnimationBlend;
#endif
  position = vec4f(
    position.xyz + getGPUCrowdMorphDelta(
      inputs.instanceIndex,
      inputs.vertexIndex,
      0u,
      u32(CROWD_MORPH_VERTEX_COUNT),
      u32(CROWD_MORPH_TARGET_COUNT),
      u32(CROWD_ANIMATION_JOINT_COUNT),
      animationFrames,
      animationBlend,
      u32(CROWD_ANIMATION_FRAME_STRIDE)
    ),
    1.0
  );
#ifdef HAS_NORMALS
  normal = normalize(normal + getGPUCrowdMorphDelta(
    inputs.instanceIndex,
    inputs.vertexIndex,
    1u,
    u32(CROWD_MORPH_VERTEX_COUNT),
    u32(CROWD_MORPH_TARGET_COUNT),
    u32(CROWD_ANIMATION_JOINT_COUNT),
    animationFrames,
    animationBlend,
    u32(CROWD_ANIMATION_FRAME_STRIDE)
  ));
#endif
#ifdef HAS_TANGENTS
  tangent = vec4f(normalize(tangent.xyz + getGPUCrowdMorphDelta(
    inputs.instanceIndex,
    inputs.vertexIndex,
    2u,
    u32(CROWD_MORPH_VERTEX_COUNT),
    u32(CROWD_MORPH_TARGET_COUNT),
    u32(CROWD_ANIMATION_JOINT_COUNT),
    animationFrames,
    animationBlend,
    u32(CROWD_ANIMATION_FRAME_STRIDE)
  )), tangent.w);
#endif
#endif

#ifdef HAS_SKIN
#ifdef HAS_GPU_CROWD_ANIMATION
  let skinMatrix = getGPUAnimatedSkinMatrix(
    inputs.WEIGHTS_0,
    inputs.JOINTS_0,
    inputs.instanceAnimationFrames,
    inputs.instanceAnimationBlend,
    u32(CROWD_ANIMATION_FRAME_STRIDE)
  );
#else
#ifdef HAS_INSTANCED_SKIN
  let skinMatrix = getInstancedSkinMatrix(
    inputs.WEIGHTS_0,
    inputs.JOINTS_0,
    inputs.instanceIndex,
    u32(CROWD_JOINTS_PER_INSTANCE)
  );
#else
  let skinMatrix = getSkinMatrix(inputs.WEIGHTS_0, inputs.JOINTS_0);
#endif
#endif
  position = skinMatrix * position;
  normal = normalize((skinMatrix * vec4f(normal, 0.0)).xyz);
#ifdef HAS_TANGENTS
  tangent = vec4f(normalize((skinMatrix * vec4f(tangent.xyz, 0.0)).xyz), tangent.w);
#endif
#endif

#ifdef HAS_GLTF_INSTANCING
  var instanceMatrix = mat4x4f(
    inputs.instanceModelMatrixCol0,
    inputs.instanceModelMatrixCol1,
    inputs.instanceModelMatrixCol2,
    inputs.instanceModelMatrixCol3
  );
#ifdef HAS_GPU_CROWD_ANIMATION
  instanceMatrix *= sampleGPUAnimationMatrix(
    inputs.instanceAnimationFrames,
    inputs.instanceAnimationBlend,
    0u,
    u32(CROWD_ANIMATION_FRAME_STRIDE)
  );
#endif
  position = instanceMatrix * position;
  normal = normalize(getGLTFInstanceNormalMatrix(mat3x3f(
    instanceMatrix[0].xyz,
    instanceMatrix[1].xyz,
    instanceMatrix[2].xyz
  )) * normal);
#ifdef HAS_TANGENTS
  tangent = vec4f(normalize((instanceMatrix * vec4f(tangent.xyz, 0.0)).xyz), tangent.w);
#endif
#endif

  let worldPosition = pbrProjection.modelMatrix * position;

#ifdef HAS_NORMALS
  normal = normalize((pbrProjection.normalMatrix * vec4f(normal, 0.0)).xyz);
#endif
#ifdef HAS_TANGENTS
  let worldTangent = normalize((pbrProjection.modelMatrix * vec4f(tangent.xyz, 0.0)).xyz);
  outputs.pbrTangent = vec4f(worldTangent, tangent.w);
#endif

  outputs.position = pbrProjection.modelViewProjectionMatrix * position;
  outputs.pbrPosition = worldPosition.xyz / worldPosition.w;
  outputs.pbrUV0 = uv0;
  outputs.pbrUV1 = uv1;
  outputs.pbrNormal = normal;
  return outputs;
}

@fragment
fn fragmentMain(inputs: FragmentInputs) -> @location(0) vec4f {
  fragmentInputs.pbr_vPosition = inputs.pbrPosition;
  fragmentInputs.pbr_vUV0 = inputs.pbrUV0;
  fragmentInputs.pbr_vUV1 = inputs.pbrUV1;
  fragmentInputs.pbr_vNormal = inputs.pbrNormal;
#ifdef HAS_TANGENTS
  let tangent = normalize(inputs.pbrTangent.xyz);
  let bitangent = normalize(cross(inputs.pbrNormal, tangent)) * inputs.pbrTangent.w;
  fragmentInputs.pbr_vTBN = mat3x3f(tangent, bitangent, inputs.pbrNormal);
#endif
  return pbr_filterColor(vec4f(1.0));
}
`,dA=`#version 300 es

  // in vec4 POSITION;
  in vec4 positions;

  #ifdef HAS_NORMALS
    // in vec4 NORMAL;
    in vec4 normals;
  #endif

  #ifdef HAS_TANGENTS
    in vec4 TANGENT;
  #endif

  #ifdef HAS_UV
    // in vec2 TEXCOORD_0;
    in vec2 texCoords;
  #endif

  #ifdef HAS_UV_1
    in vec2 texCoords1;
  #endif

  #ifdef HAS_SKIN
    in uvec4 JOINTS_0;
    in vec4 WEIGHTS_0;
  #endif

  #ifdef HAS_GLTF_INSTANCING
    in vec4 instanceModelMatrixCol0;
    in vec4 instanceModelMatrixCol1;
    in vec4 instanceModelMatrixCol2;
    in vec4 instanceModelMatrixCol3;
  #endif

  #ifdef HAS_GPU_CROWD_ANIMATION
    in vec4 instanceAnimationFrames;
    in vec4 instanceAnimationBlend;
  #endif

  void main(void) {
    vec4 _NORMAL = vec4(0.);
    vec4 _TANGENT = vec4(0.);
    vec2 _TEXCOORD_0 = vec2(0.);
    vec2 _TEXCOORD_1 = vec2(0.);

    #ifdef HAS_NORMALS
      _NORMAL = normals;
    #endif

    #ifdef HAS_TANGENTS
      _TANGENT = TANGENT;
    #endif

    #ifdef HAS_UV
      _TEXCOORD_0 = texCoords;
    #endif

    #ifdef HAS_UV_1
      _TEXCOORD_1 = texCoords1;
    #endif

    vec4 pos = positions;

    #ifdef HAS_INSTANCED_MORPH
      vec4 animationFrames = vec4(0.0);
      vec4 animationBlend = vec4(0.0);
      #ifdef HAS_GPU_CROWD_ANIMATION
        animationFrames = instanceAnimationFrames;
        animationBlend = instanceAnimationBlend;
      #endif
      pos.xyz += getGPUCrowdMorphDelta(
        uint(gl_InstanceID),
        uint(gl_VertexID),
        0u,
        uint(CROWD_MORPH_TARGET_COUNT),
        uint(CROWD_ANIMATION_JOINT_COUNT),
        animationFrames,
        animationBlend
      );
      #ifdef HAS_NORMALS
        _NORMAL.xyz = normalize(_NORMAL.xyz + getGPUCrowdMorphDelta(
          uint(gl_InstanceID),
          uint(gl_VertexID),
          1u,
          uint(CROWD_MORPH_TARGET_COUNT),
          uint(CROWD_ANIMATION_JOINT_COUNT),
          animationFrames,
          animationBlend
        ));
      #endif
      #ifdef HAS_TANGENTS
        _TANGENT.xyz = normalize(_TANGENT.xyz + getGPUCrowdMorphDelta(
          uint(gl_InstanceID),
          uint(gl_VertexID),
          2u,
          uint(CROWD_MORPH_TARGET_COUNT),
          uint(CROWD_ANIMATION_JOINT_COUNT),
          animationFrames,
          animationBlend
        ));
      #endif
    #endif

    #ifdef HAS_SKIN
      #ifdef HAS_GPU_CROWD_ANIMATION
        mat4 skinMat = getGPUAnimatedSkinMatrix(
          WEIGHTS_0,
          JOINTS_0,
          instanceAnimationFrames,
          instanceAnimationBlend
        );
      #else
      #ifdef HAS_INSTANCED_SKIN
        mat4 skinMat = getInstancedSkinMatrix(
          WEIGHTS_0,
          JOINTS_0,
          uint(gl_InstanceID),
          uint(CROWD_JOINTS_PER_INSTANCE)
        );
      #else
      mat4 skinMat = getSkinMatrix(WEIGHTS_0, JOINTS_0);
      #endif
      #endif
      pos = skinMat * pos;
      _NORMAL = skinMat * _NORMAL;
      _TANGENT = vec4((skinMat * vec4(_TANGENT.xyz, 0.)).xyz, _TANGENT.w);
    #endif

    #ifdef HAS_GLTF_INSTANCING
      mat4 instanceMatrix = mat4(
        instanceModelMatrixCol0,
        instanceModelMatrixCol1,
        instanceModelMatrixCol2,
        instanceModelMatrixCol3
      );
      #ifdef HAS_GPU_CROWD_ANIMATION
        instanceMatrix *= sampleGPUAnimationMatrix(
          instanceAnimationFrames,
          instanceAnimationBlend,
          0
        );
      #endif
      pos = instanceMatrix * pos;
      _NORMAL = vec4(normalize(transpose(inverse(mat3(instanceMatrix))) * _NORMAL.xyz), 0.0);
      _TANGENT = vec4(normalize(mat3(instanceMatrix) * _TANGENT.xyz), _TANGENT.w);
    #endif

    pbr_setPositionNormalTangentUV(pos, _NORMAL, _TANGENT, _TEXCOORD_0, _TEXCOORD_1);
    gl_Position = pbrProjection.modelViewProjectionMatrix * pos;
  }
`,hA=`#version 300 es
  out vec4 fragmentColor;

  void main(void) {
    vec3 pos = pbr_vPosition;
    fragmentColor = pbr_filterColor(vec4(1.0));
  }
`;function Sh(n,e){const t=e.materialFactory||new Va(n,{modules:[Na]}),r={...e.parsedPPBRMaterial.uniforms};delete r.camera;const i=Object.fromEntries(Object.entries({...r,...e.parsedPPBRMaterial.bindings}).filter(([o,a])=>t.ownsBinding(o)&&pA(a))),s=t.createMaterial({id:e.id,bindings:i});return s.setProps({pbrMaterial:r}),s}function mA(n,e){var sc,oc;const{id:t,geometry:r,parsedPPBRMaterial:i,vertexCount:s,modelOptions:o={},instanceMatrices:a,morphTargets:c=[]}=e,l=(sc=o.userData)==null?void 0:sc.gltfAnimatedCrowd;if(l&&a)throw new Error("Nested glTF crowd instancing is unsupported");S.info(4,"createGLTFModel defines: ",i.defines)();const u=[],d={depthWriteEnabled:!0,depthCompare:"less",depthFormat:"depth24plus",cullMode:"back"},h={},m=[],p=[],g=[],b=!!(l!=null&&l.gpuAnimation);if(a||l)for(let ie=0;ie<4;ie++){const ge=new Float32Array(((l==null?void 0:l.capacity)||(a==null?void 0:a.length)||0)*4);a==null||a.forEach((nr,it)=>{for(let Tt=0;Tt<4;Tt++)ge[it*4+Tt]=nr[ie*4+Tt]});const Ce=`instanceModelMatrixCol${ie}`,sn=n.createBuffer({id:`${t||"gltf"}-${Ce}`,data:ge,usage:F.VERTEX|F.COPY_DST});h[Ce]=sn,m.push({name:Ce,format:"float32x4",stepMode:"instance"}),u.push(sn),p.push(sn),g.push(ge)}let _,y,v,w;if(l&&b){_=new Float32Array(l.capacity*4),v=new Float32Array(l.capacity*4);for(const[ie,ge]of[["instanceAnimationFrames",_],["instanceAnimationBlend",v]]){const Ce=n.createBuffer({id:`${t||"gltf"}-${ie}`,data:ge,usage:F.VERTEX|F.COPY_DST});h[ie]=Ce,m.push({name:ie,format:"float32x4",stepMode:"instance"}),u.push(Ce),ie==="instanceAnimationFrames"?y=Ce:w=Ce}}const x=!!i.defines.HAS_SKIN,T=!!(l&&x&&!b);let A,M;l&&T&&(M=new Float32Array(l.capacity*l.jointsPerInstance*16),A=n.type==="webgpu"?n.createBuffer({id:`${t||"gltf"}-crowd-joint-matrices`,byteLength:M.byteLength,usage:F.STORAGE|F.COPY_DST}):n.createTexture({id:`${t||"gltf"}-crowd-joint-matrices`,format:"rgba32float",width:l.jointsPerInstance*4,height:l.capacity,usage:N.SAMPLE|N.COPY_DST,sampler:{minFilter:"nearest",magFilter:"nearest",mipmapFilter:"nearest"}}),u.push(A));const L=l?c.length:0,C=Math.floor((((oc=r.attributes.POSITION)==null?void 0:oc.value.length)||0)/3);let I,B,P;if(l&&L>0&&C>0){const ie=new Float32Array(L*3*C*4);for(const[ge,Ce]of c.entries())for(const[sn,nr]of["POSITION","NORMAL","TANGENT"].entries()){const it=Ce[nr];if(!it)continue;const Tt=nr==="TANGENT"&&it.length===C*4?4:3;for(let rr=0;rr<C;rr++){const qi=((ge*3+sn)*C+rr)*4,Yi=rr*Tt;ie[qi]=it[Yi]||0,ie[qi+1]=it[Yi+1]||0,ie[qi+2]=it[Yi+2]||0}}if(I=Hs(n,`${t||"gltf"}-crowd-morph-targets`,ie,C,L*3),u.push(I),!b){const ge=Math.ceil(L/4);B=new Float32Array(l.capacity*ge*4),P=Hs(n,`${t||"gltf"}-crowd-morph-weights`,B,ge,l.capacity),u.push(P)}}const R=x&&l?l.jointsPerInstance:0,H=4+R*4+L;let re,te;l!=null&&l.gpuAnimation&&(te=new Float32Array(l.gpuAnimation.frameCount*H*4),re=Hs(n,`${t||"gltf"}-crowd-animation-frames`,te,H,l.gpuAnimation.frameCount),u.push(re));let St=fA;for(const[ie,ge]of[["CROWD_JOINTS_PER_INSTANCE",(l==null?void 0:l.jointsPerInstance)||0],["CROWD_MORPH_VERTEX_COUNT",C],["CROWD_MORPH_TARGET_COUNT",L],["CROWD_ANIMATION_JOINT_COUNT",R],["CROWD_ANIMATION_FRAME_STRIDE",H]])St=St.replaceAll(`u32(${ie})`,`u32(${ge})`);const Ki={id:t,source:St,vs:dA,fs:hA,geometry:r,topology:r.topology,vertexCount:s,modules:[Na,Cx,...l?[Ox]:[]],...o,...a||l?{attributes:{...o.attributes,...h},bufferLayout:[...o.bufferLayout||[],...m],instanceCount:(a==null?void 0:a.length)||0,isInstanced:!0}:{},defines:{...i.defines,...o.defines,...a||l?{HAS_GLTF_INSTANCING:!0}:{},...T?{HAS_INSTANCED_SKIN:!0,CROWD_JOINTS_PER_INSTANCE:l.jointsPerInstance}:{},...b?{HAS_GPU_CROWD_ANIMATION:!0,CROWD_ANIMATION_FRAME_STRIDE:H}:{},...I?{HAS_INSTANCED_MORPH:!0,CROWD_MORPH_TARGET_COUNT:L}:{},...l?{CROWD_ANIMATION_JOINT_COUNT:R}:{}},parameters:{...d,...i.parameters,...o.parameters}},wt=e.material||Sh(n,{id:t?`${t}-material`:void 0,parsedPPBRMaterial:i});Ki.material=wt;const rn=new Ht(n,Ki),um={...i.uniforms,...o.uniforms,...i.bindings,...o.bindings},fm=gA(rn.shaderInputs.getModules(),wt,um);rn.shaderInputs.setProps(fm),A&&rn.shaderInputs.setProps({skin:{jointMatrices:[],skinJointMatrices:A}}),(re||I||P)&&rn.shaderInputs.setProps({gpuAnimation:{...re?{gpuAnimationFrames:re}:{},...I?{gpuMorphTargets:I}:{},...P?{gpuMorphWeights:P}:{}}});const ic=new Jn({managedResources:u,model:rn,bounds:e.bounds,instanceMatrices:a});return l&&(ic.userData.gltfAnimatedCrowd={transformBuffers:p,transformColumns:g,skinJointMatrices:A,jointMatrices:M,jointsPerInstance:l.jointsPerInstance,morphTargetCount:L,morphTargetData:I,morphWeights:B,morphWeightData:P,animationFrames:re,animationFrameValues:te,animationFrameStride:H,animationJointCount:R,animationParameters:_,animationParameterBuffer:y,animationBlend:v,animationBlendBuffer:w}),ic}function Hs(n,e,t,r,i){if(n.type==="webgpu")return n.createBuffer({id:e,data:t,usage:F.STORAGE|F.COPY_DST});const s=n.createTexture({id:e,format:"rgba32float",width:r,height:i,usage:N.SAMPLE|N.COPY_DST,sampler:{minFilter:"nearest",magFilter:"nearest",mipmapFilter:"nearest"}});return s.writeData(t,{width:r,height:i}),s}function pA(n){return n instanceof F||n instanceof Go||n instanceof $t||n instanceof N||n instanceof Vt}function gA(n,e,t){const r=new Map;for(const s of n){for(const o of Object.keys(s.uniformTypes||{}))r.set(o,s.name);for(const o of s.bindingLayout||[])r.set(o.name,s.name)}const i={};for(const[s,o]of Object.entries(t)){if(o===void 0)continue;const a=r.get(s);!a||e.ownsModule(a)||(i[a]||(i[a]={}),i[a][s]=o)}return i}function bA(n,e){var o,a;const t=(a=(o=e.extensions)==null?void 0:o.EXT_mesh_gpu_instancing)==null?void 0:a.attributes;if(!t||typeof t!="object")return null;const r={};let i;for(const[c,l]of Object.entries(t)){const u=typeof l=="number"?n.accessors[l]:l;if(!u||!ArrayBuffer.isView(u.value))throw new Error(`Invalid glTF instance accessor for ${c}`);if(i!==void 0&&u.count!==i)throw new Error("glTF instance attributes must have matching accessor counts");i=u.count,r[c]={value:u.value,size:u.components||_A(u.type),count:u.count,normalized:!!u.normalized}}const s=[];for(let c=0;c<(i||0);c++){const l=js(r.TRANSLATION,c,[0,0,0]),u=js(r.ROTATION,c,[0,0,0,1]),d=js(r.SCALE,c,[1,1,1]),h=Math.hypot(...u);if(h>0)for(let m=0;m<u.length;m++)u[m]/=h;s.push(new $().translate(l).multiplyRight(new $().fromQuaternion(u)).scale(d))}return{matrices:s,attributes:r}}function js(n,e,t){if(!n)return[...t];const r=n.value;return t.map((i,s)=>{const o=r[e*n.size+s];return o===void 0?i:n.normalized?n.value instanceof Int8Array?Math.max(o/127,-1):n.value instanceof Int16Array?Math.max(o/32767,-1):n.value instanceof Uint8Array?o/255:n.value instanceof Uint16Array?o/65535:o:o})}function _A(n){switch(n){case"VEC2":return 2;case"VEC3":return 3;case"VEC4":return 4;default:return 1}}function wh(n,e){n.userData.morphWeights=[...e];const t=n.userData.morphMeshes||[];for(const r of t)r.preorderTraversal(i=>{if(!(i instanceof Jn))return;const s=i.userData.morphTargets;s&&(Tw(i.model,s.geometry,s.targets,e),i.userData.morphWeights=[...e])})}var U;(function(n){n[n.POINTS=0]="POINTS",n[n.LINES=1]="LINES",n[n.LINE_LOOP=2]="LINE_LOOP",n[n.LINE_STRIP=3]="LINE_STRIP",n[n.TRIANGLES=4]="TRIANGLES",n[n.TRIANGLE_STRIP=5]="TRIANGLE_STRIP",n[n.TRIANGLE_FAN=6]="TRIANGLE_FAN",n[n.ONE=1]="ONE",n[n.SRC_ALPHA=770]="SRC_ALPHA",n[n.ONE_MINUS_SRC_ALPHA=771]="ONE_MINUS_SRC_ALPHA",n[n.FUNC_ADD=32774]="FUNC_ADD",n[n.LINEAR=9729]="LINEAR",n[n.NEAREST=9728]="NEAREST",n[n.NEAREST_MIPMAP_NEAREST=9984]="NEAREST_MIPMAP_NEAREST",n[n.LINEAR_MIPMAP_NEAREST=9985]="LINEAR_MIPMAP_NEAREST",n[n.NEAREST_MIPMAP_LINEAR=9986]="NEAREST_MIPMAP_LINEAR",n[n.LINEAR_MIPMAP_LINEAR=9987]="LINEAR_MIPMAP_LINEAR",n[n.TEXTURE_MAG_FILTER=10240]="TEXTURE_MAG_FILTER",n[n.TEXTURE_MIN_FILTER=10241]="TEXTURE_MIN_FILTER",n[n.TEXTURE_WRAP_S=10242]="TEXTURE_WRAP_S",n[n.TEXTURE_WRAP_T=10243]="TEXTURE_WRAP_T",n[n.REPEAT=10497]="REPEAT",n[n.CLAMP_TO_EDGE=33071]="CLAMP_TO_EDGE",n[n.MIRRORED_REPEAT=33648]="MIRRORED_REPEAT",n[n.UNPACK_FLIP_Y_WEBGL=37440]="UNPACK_FLIP_Y_WEBGL"})(U||(U={}));function yA(n){switch(n){case U.POINTS:return"point-list";case U.LINES:return"line-list";case U.LINE_STRIP:return"line-strip";case U.TRIANGLES:return"triangle-list";case U.TRIANGLE_STRIP:return"triangle-strip";default:throw new Error(String(n))}}function vA(n,e,t){if(n!==U.LINE_LOOP&&n!==U.TRIANGLE_FAN)return{topology:yA(n)};const r=(e==null?void 0:e.length)??t,i=n===U.LINE_LOOP?r>=2?r*2:0:r>=3?(r-2)*3:0,s=e instanceof Uint32Array||!e&&t>65536?Uint32Array:Uint16Array,o=new s(i),a=c=>(e==null?void 0:e[c])??c;if(n===U.LINE_LOOP){for(let c=0;c<r;c++)o[c*2]=a(c),o[c*2+1]=a((c+1)%r);return{topology:"line-list",indices:o}}for(let c=0;c<r-2;c++)o[c*3]=a(0),o[c*3+1]=a(c+1),o[c*3+2]=a(c+2);return{topology:"triangle-list",indices:o}}const Za=[X("baseColor","pbr_baseColorSampler","baseColorTexture",["pbrMetallicRoughness","baseColorTexture"]),X("metallicRoughness","pbr_metallicRoughnessSampler","metallicRoughnessTexture",["pbrMetallicRoughness","metallicRoughnessTexture"]),X("normal","pbr_normalSampler","normalTexture",["normalTexture"]),X("occlusion","pbr_occlusionSampler","occlusionTexture",["occlusionTexture"]),X("emissive","pbr_emissiveSampler","emissiveTexture",["emissiveTexture"]),X("specularColor","pbr_specularColorSampler","KHR_materials_specular.specularColorTexture",["extensions","KHR_materials_specular","specularColorTexture"]),X("specularIntensity","pbr_specularIntensitySampler","KHR_materials_specular.specularTexture",["extensions","KHR_materials_specular","specularTexture"]),X("transmission","pbr_transmissionSampler","KHR_materials_transmission.transmissionTexture",["extensions","KHR_materials_transmission","transmissionTexture"]),X("thickness","pbr_thicknessSampler","KHR_materials_volume.thicknessTexture",["extensions","KHR_materials_volume","thicknessTexture"]),X("clearcoat","pbr_clearcoatSampler","KHR_materials_clearcoat.clearcoatTexture",["extensions","KHR_materials_clearcoat","clearcoatTexture"]),X("clearcoatRoughness","pbr_clearcoatRoughnessSampler","KHR_materials_clearcoat.clearcoatRoughnessTexture",["extensions","KHR_materials_clearcoat","clearcoatRoughnessTexture"]),X("clearcoatNormal","pbr_clearcoatNormalSampler","KHR_materials_clearcoat.clearcoatNormalTexture",["extensions","KHR_materials_clearcoat","clearcoatNormalTexture"]),X("sheenColor","pbr_sheenColorSampler","KHR_materials_sheen.sheenColorTexture",["extensions","KHR_materials_sheen","sheenColorTexture"]),X("sheenRoughness","pbr_sheenRoughnessSampler","KHR_materials_sheen.sheenRoughnessTexture",["extensions","KHR_materials_sheen","sheenRoughnessTexture"]),X("iridescence","pbr_iridescenceSampler","KHR_materials_iridescence.iridescenceTexture",["extensions","KHR_materials_iridescence","iridescenceTexture"]),X("iridescenceThickness","pbr_iridescenceThicknessSampler","KHR_materials_iridescence.iridescenceThicknessTexture",["extensions","KHR_materials_iridescence","iridescenceThicknessTexture"]),X("anisotropy","pbr_anisotropySampler","KHR_materials_anisotropy.anisotropyTexture",["extensions","KHR_materials_anisotropy","anisotropyTexture"]),X("bump","pbr_bumpSampler","EXT_materials_bump.bumpTexture",["extensions","EXT_materials_bump","bumpTexture"]),X("diffuseTransmission","pbr_diffuseTransmissionSampler","KHR_materials_diffuse_transmission.diffuseTransmissionTexture",["extensions","KHR_materials_diffuse_transmission","diffuseTransmissionTexture"]),X("diffuseTransmissionColor","pbr_diffuseTransmissionColorSampler","KHR_materials_diffuse_transmission.diffuseTransmissionColorTexture",["extensions","KHR_materials_diffuse_transmission","diffuseTransmissionColorTexture"]),X("multiscatterColor","pbr_multiscatterColorSampler","KHR_materials_volume_scatter.multiscatterColorTexture",["extensions","KHR_materials_volume_scatter","multiscatterColorTexture"])],xA=new Map(Za.map(n=>[n.slot,n]));function X(n,e,t,r){return{slot:n,binding:e,displayName:t,pathSegments:r,colorSpace:n==="baseColor"||n==="emissive"||n==="specularColor"||n==="sheenColor"||n==="diffuseTransmissionColor"||n==="multiscatterColor"?"srgb":"linear",uvSetUniform:`${n}UVSet`,uvTransformUniform:`${n}UVTransform`}}function SA(){return Za}function Th(n){const e=xA.get(n);if(!e)throw new Error(`Unknown PBR texture transform slot ${n}`);return e}function Eh(n){var t;const e=(t=n==null?void 0:n.extensions)==null?void 0:t.KHR_texture_transform;return{offset:e!=null&&e.offset?[e.offset[0],e.offset[1]]:[0,0],rotation:(e==null?void 0:e.rotation)??0,scale:e!=null&&e.scale?[e.scale[0],e.scale[1]]:[1,1]}}function Ah(n){var t;const e=(t=n==null?void 0:n.extensions)==null?void 0:t.KHR_texture_transform;return(e==null?void 0:e.texCoord)??(n==null?void 0:n.texCoord)??0}function wA(n){return Za.find(e=>e.pathSegments.length===n.length&&e.pathSegments.every((t,r)=>n[r]===t))||null}function Qo(n){const e=new Ie().set(1,0,0,0,1,0,n.offset[0],n.offset[1],1),t=new Ie().set(Math.cos(n.rotation),Math.sin(n.rotation),0,-Math.sin(n.rotation),Math.cos(n.rotation),0,0,0,1),r=new Ie().set(n.scale[0],0,0,0,n.scale[1],0,0,0,1);return Array.from(e.multiplyRight(t).multiplyRight(r))}function TA(n,e){const t=new Ie(Qo(n)),r=new Ie(Qo(e)),i=new Ie(t).invert();return Array.from(r.multiplyRight(i))}function EA(n={}){var c,l,u,d;const e=n.wrapS??((c=n.parameters)==null?void 0:c[U.TEXTURE_WRAP_S]),t=n.wrapT??((l=n.parameters)==null?void 0:l[U.TEXTURE_WRAP_T]),r=n.magFilter??((u=n.parameters)==null?void 0:u[U.TEXTURE_MAG_FILTER]),i=n.minFilter??((d=n.parameters)==null?void 0:d[U.TEXTURE_MIN_FILTER]),s=uu(e),o=uu(t),a=AA(r);return{...s?{addressModeU:s}:{},...o?{addressModeV:o}:{},...a?{magFilter:a}:{},...RA(i)}}function uu(n){switch(n){case U.CLAMP_TO_EDGE:return"clamp-to-edge";case U.REPEAT:return"repeat";case U.MIRRORED_REPEAT:return"mirror-repeat";default:return}}function AA(n){switch(n){case U.NEAREST:return"nearest";case U.LINEAR:return"linear";default:return}}function RA(n){switch(n){case U.NEAREST:return{minFilter:"nearest"};case U.LINEAR:return{minFilter:"linear"};case U.NEAREST_MIPMAP_NEAREST:return{minFilter:"nearest",mipmapFilter:"nearest"};case U.LINEAR_MIPMAP_NEAREST:return{minFilter:"linear",mipmapFilter:"nearest"};case U.NEAREST_MIPMAP_LINEAR:return{minFilter:"nearest",mipmapFilter:"linear"};case U.LINEAR_MIPMAP_LINEAR:return{minFilter:"linear",mipmapFilter:"linear"};default:return{}}}const IA={NORMAL:["NORMAL","normals"],TANGENT:["TANGENT"],TEXCOORD_0:["TEXCOORD_0","texCoords"],TEXCOORD_1:["TEXCOORD_1","texCoords1"],JOINTS_0:["JOINTS_0"],WEIGHTS_0:["WEIGHTS_0"],COLOR_0:["COLOR_0","colors"]};function MA(n,e,t,r){const i={defines:{MANUAL_SRGB:!0},bindings:{},uniforms:{camera:[0,0,0],metallicRoughnessValues:[1,1]},parameters:{},glParameters:{},generatedTextures:[]};i.defines.USE_TEX_LOD=!0;const{imageBasedLightingEnvironment:s}=r;return s&&(i.bindings.pbr_diffuseEnvSampler=s.diffuseEnvSampler.texture,i.bindings.pbr_specularEnvSampler=s.specularEnvSampler.texture,i.bindings.pbr_brdfLUT=s.brdfLutTexture.texture,i.uniforms.IBLenabled=!0,i.uniforms.scaleIBLAmbient=[1,1]),r!=null&&r.pbrDebug&&(i.defines.PBR_DEBUG=!0,i.uniforms.scaleDiffBaseMR=[0,0,0,0],i.uniforms.scaleFGDSpec=[0,0,0,0]),Te(t,"NORMAL")&&(i.defines.HAS_NORMALS=!0),Te(t,"TANGENT")&&(r!=null&&r.useTangents)&&(i.defines.HAS_TANGENTS=!0),Te(t,"TEXCOORD_0")&&(i.defines.HAS_UV=!0),Te(t,"TEXCOORD_1")&&(i.defines.HAS_UV_1=!0),Te(t,"JOINTS_0")&&Te(t,"WEIGHTS_0")&&(i.defines.HAS_SKIN=!0),Te(t,"COLOR_0")&&(i.defines.HAS_COLORS=!0),r!=null&&r.imageBasedLightingEnvironment&&(i.defines.USE_IBL=!0),r!=null&&r.lights&&(i.defines.USE_LIGHTS=!0),e&&(r.validateAttributes!==!1&&LA(e,t),PA(n,e,i,t,r.gltf)),i}function LA(n,e){var o;const t=fu(n,0);t.length>0&&!Te(e,"TEXCOORD_0")&&S.warn(`glTF material uses ${t.join(", ")} but primitive is missing TEXCOORD_0; textured shading will sample the default UV coordinates`)();const r=fu(n,1);if(r.length>0&&!Te(e,"TEXCOORD_1")&&S.warn(`glTF material uses ${r.join(", ")} with TEXCOORD_1 but primitive is missing TEXCOORD_1; those textures will be skipped`)(),!!(n.unlit||(o=n.extensions)!=null&&o.KHR_materials_unlit)||Te(e,"NORMAL"))return;const s=n.normalTexture?"lit PBR shading with normalTexture":"lit PBR shading";S.warn(`glTF primitive is missing NORMAL while using ${s}; shading will fall back to geometric normals`)()}function fu(n,e){const t=[];for(const r of SA()){const i=CA(n,r.pathSegments);i&&Ah(i)===e&&t.push(r.displayName)}return t}function Te(n,e){return IA[e].some(t=>!!n[t])}function CA(n,e){let t=n;for(const r of e)if(t=t==null?void 0:t[r],!t)return null;return t}function PA(n,e,t,r,i){var s;if(t.uniforms.unlit=!!(e.unlit||(s=e.extensions)!=null&&s.KHR_materials_unlit),e.pbrMetallicRoughness&&OA(n,e.pbrMetallicRoughness,t,r,i),e.normalTexture){K(n,e.normalTexture,"pbr_normalSampler",t,{featureOptions:{define:"HAS_NORMALMAP",enabledUniformName:"normalMapEnabled"},gltf:i,attributes:r,textureTransformSlot:"normal"});const{scale:o=1}=e.normalTexture;t.uniforms.normalScale=o}if(e.occlusionTexture){K(n,e.occlusionTexture,"pbr_occlusionSampler",t,{featureOptions:{define:"HAS_OCCLUSIONMAP",enabledUniformName:"occlusionMapEnabled"},gltf:i,attributes:r,textureTransformSlot:"occlusion"});const{strength:o=1}=e.occlusionTexture;t.uniforms.occlusionStrength=o}switch(t.uniforms.emissiveFactor=e.emissiveFactor||[0,0,0],e.emissiveTexture&&K(n,e.emissiveTexture,"pbr_emissiveSampler",t,{featureOptions:{define:"HAS_EMISSIVEMAP",enabledUniformName:"emissiveMapEnabled"},gltf:i,attributes:r,textureTransformSlot:"emissive"}),FA(n,e.extensions,t,i,r),e.alphaMode||"OPAQUE"){case"OPAQUE":break;case"MASK":{const{alphaCutoff:o=.5}=e;t.defines.ALPHA_CUTOFF=!0,t.uniforms.alphaCutoffEnabled=!0,t.uniforms.alphaCutoff=o;break}case"BLEND":S.warn("glTF BLEND alphaMode might not work well because it requires mesh sorting")(),BA(t);break}}function BA(n){n.parameters.blend=!0,n.parameters.blendColorOperation="add",n.parameters.blendColorSrcFactor="src-alpha",n.parameters.blendColorDstFactor="one-minus-src-alpha",n.parameters.blendAlphaOperation="add",n.parameters.blendAlphaSrcFactor="one",n.parameters.blendAlphaDstFactor="one-minus-src-alpha",n.glParameters.blend=!0,n.glParameters.blendEquation=U.FUNC_ADD,n.glParameters.blendFunc=[U.SRC_ALPHA,U.ONE_MINUS_SRC_ALPHA,U.ONE,U.ONE_MINUS_SRC_ALPHA]}function NA(n){n.parameters.blend=!0,n.parameters.depthWriteEnabled=!1,n.parameters.blendColorOperation="add",n.parameters.blendColorSrcFactor="one",n.parameters.blendColorDstFactor="one-minus-src-alpha",n.parameters.blendAlphaOperation="add",n.parameters.blendAlphaSrcFactor="one",n.parameters.blendAlphaDstFactor="one-minus-src-alpha",n.glParameters.blend=!0,n.glParameters.depthMask=!1,n.glParameters.blendEquation=U.FUNC_ADD,n.glParameters.blendFunc=[U.ONE,U.ONE_MINUS_SRC_ALPHA,U.ONE,U.ONE_MINUS_SRC_ALPHA]}function OA(n,e,t,r,i){e.baseColorTexture&&K(n,e.baseColorTexture,"pbr_baseColorSampler",t,{featureOptions:{define:"HAS_BASECOLORMAP",enabledUniformName:"baseColorMapEnabled"},gltf:i,attributes:r,textureTransformSlot:"baseColor"}),t.uniforms.baseColorFactor=e.baseColorFactor||[1,1,1,1],e.metallicRoughnessTexture&&K(n,e.metallicRoughnessTexture,"pbr_metallicRoughnessSampler",t,{featureOptions:{define:"HAS_METALROUGHNESSMAP",enabledUniformName:"metallicRoughnessMapEnabled"},gltf:i,attributes:r,textureTransformSlot:"metallicRoughness"});const{metallicFactor:s=1,roughnessFactor:o=1}=e;t.uniforms.metallicRoughnessValues=[s,o]}function FA(n,e,t,r,i={}){e&&(UA(e)&&(t.defines.USE_MATERIAL_EXTENSIONS=!0),DA(n,e.KHR_materials_specular,t,r,i),kA(e.KHR_materials_ior,t),VA(n,e.EXT_materials_bump,t,r,i),$A(n,e.KHR_materials_transmission,t,r,i),GA(n,e.KHR_materials_diffuse_transmission,t,r,i),zA(n,e.KHR_materials_volume,t,r,i),WA(n,e.KHR_materials_volume_scatter,e.KHR_materials_volume,t,r,i),HA(e.KHR_materials_dispersion,t),jA(n,e.KHR_materials_clearcoat,t,r,i),XA(n,e.KHR_materials_sheen,t,r,i),KA(n,e.KHR_materials_iridescence,t,r,i),qA(n,e.KHR_materials_anisotropy,t,r,i),YA(e.KHR_materials_emissive_strength,t))}function UA(n){return!!(n.KHR_materials_specular||n.KHR_materials_ior||n.EXT_materials_bump||n.KHR_materials_transmission||n.KHR_materials_diffuse_transmission||n.KHR_materials_volume||n.KHR_materials_volume_scatter||n.KHR_materials_dispersion||n.KHR_materials_clearcoat||n.KHR_materials_sheen||n.KHR_materials_iridescence||n.KHR_materials_anisotropy)}function DA(n,e,t,r,i={}){e&&(e.specularColorFactor&&(t.uniforms.specularColorFactor=e.specularColorFactor),e.specularFactor!==void 0&&(t.uniforms.specularIntensityFactor=e.specularFactor),e.specularColorTexture&&K(n,e.specularColorTexture,"pbr_specularColorSampler",t,{featureOptions:{define:"HAS_SPECULARCOLORMAP",enabledUniformName:"specularColorMapEnabled"},gltf:r,attributes:i,textureTransformSlot:"specularColor"}),e.specularTexture&&K(n,e.specularTexture,"pbr_specularIntensitySampler",t,{featureOptions:{define:"HAS_SPECULARINTENSITYMAP",enabledUniformName:"specularIntensityMapEnabled"},gltf:r,attributes:i,textureTransformSlot:"specularIntensity"}))}function kA(n,e){(n==null?void 0:n.ior)!==void 0&&(e.uniforms.ior=n.ior)}function $A(n,e,t,r,i={}){e&&(e.transmissionFactor!==void 0&&(t.uniforms.transmissionFactor=e.transmissionFactor),e.transmissionTexture&&K(n,e.transmissionTexture,"pbr_transmissionSampler",t,{featureOptions:{define:"HAS_TRANSMISSIONMAP",enabledUniformName:"transmissionMapEnabled"},gltf:r,attributes:i,textureTransformSlot:"transmission"}),((e.transmissionFactor??0)>0||e.transmissionTexture)&&(S.warn("KHR_materials_transmission uses a premultiplied-alpha blending approximation and may require mesh sorting")(),NA(t)))}function VA(n,e,t,r,i={}){e&&(t.uniforms.bumpFactor=Math.max(e.bumpFactor??1,0),e.bumpTexture&&K(n,e.bumpTexture,"pbr_bumpSampler",t,{featureOptions:{define:"HAS_BUMPMAP",enabledUniformName:"bumpMapEnabled"},gltf:r,attributes:i,textureTransformSlot:"bump"}))}function GA(n,e,t,r,i={}){e&&(t.uniforms.diffuseTransmissionFactor=Math.min(Math.max(e.diffuseTransmissionFactor??0,0),1),t.uniforms.diffuseTransmissionColorFactor=e.diffuseTransmissionColorFactor||[1,1,1],e.diffuseTransmissionTexture&&K(n,e.diffuseTransmissionTexture,"pbr_diffuseTransmissionSampler",t,{featureOptions:{define:"HAS_DIFFUSETRANSMISSIONMAP",enabledUniformName:"diffuseTransmissionMapEnabled"},gltf:r,attributes:i,textureTransformSlot:"diffuseTransmission"}),e.diffuseTransmissionColorTexture&&K(n,e.diffuseTransmissionColorTexture,"pbr_diffuseTransmissionColorSampler",t,{featureOptions:{define:"HAS_DIFFUSETRANSMISSIONCOLORMAP",enabledUniformName:"diffuseTransmissionColorMapEnabled"},gltf:r,attributes:i,textureTransformSlot:"diffuseTransmissionColor"}))}function zA(n,e,t,r,i={}){e&&(e.thicknessFactor!==void 0&&(t.uniforms.thicknessFactor=e.thicknessFactor),e.thicknessTexture&&K(n,e.thicknessTexture,"pbr_thicknessSampler",t,{featureOptions:{define:"HAS_THICKNESSMAP"},gltf:r,attributes:i,textureTransformSlot:"thickness"}),e.attenuationDistance!==void 0&&(t.uniforms.attenuationDistance=e.attenuationDistance),e.attenuationColor&&(t.uniforms.attenuationColor=e.attenuationColor))}function WA(n,e,t,r,i,s={}){!e||!t||(r.uniforms.multiscatterColorFactor=e.multiscatterColorFactor||e.multiscatterColor||[0,0,0],r.uniforms.scatterAnisotropy=Math.min(Math.max(e.scatterAnisotropy??0,-.999),.999),e.multiscatterColorTexture&&K(n,e.multiscatterColorTexture,"pbr_multiscatterColorSampler",r,{featureOptions:{define:"HAS_MULTISCATTERCOLORMAP",enabledUniformName:"multiscatterColorMapEnabled"},gltf:i,attributes:s,textureTransformSlot:"multiscatterColor"}))}function HA(n,e){(n==null?void 0:n.dispersion)!==void 0&&(e.uniforms.dispersion=Math.max(n.dispersion,0))}function jA(n,e,t,r,i={}){e&&(e.clearcoatFactor!==void 0&&(t.uniforms.clearcoatFactor=e.clearcoatFactor),e.clearcoatRoughnessFactor!==void 0&&(t.uniforms.clearcoatRoughnessFactor=e.clearcoatRoughnessFactor),e.clearcoatTexture&&K(n,e.clearcoatTexture,"pbr_clearcoatSampler",t,{featureOptions:{define:"HAS_CLEARCOATMAP",enabledUniformName:"clearcoatMapEnabled"},gltf:r,attributes:i,textureTransformSlot:"clearcoat"}),e.clearcoatRoughnessTexture&&K(n,e.clearcoatRoughnessTexture,"pbr_clearcoatRoughnessSampler",t,{featureOptions:{define:"HAS_CLEARCOATROUGHNESSMAP",enabledUniformName:"clearcoatRoughnessMapEnabled"},gltf:r,attributes:i,textureTransformSlot:"clearcoatRoughness"}),e.clearcoatNormalTexture&&K(n,e.clearcoatNormalTexture,"pbr_clearcoatNormalSampler",t,{featureOptions:{define:"HAS_CLEARCOATNORMALMAP"},gltf:r,attributes:i,textureTransformSlot:"clearcoatNormal"}))}function XA(n,e,t,r,i={}){e&&(e.sheenColorFactor&&(t.uniforms.sheenColorFactor=e.sheenColorFactor),e.sheenRoughnessFactor!==void 0&&(t.uniforms.sheenRoughnessFactor=e.sheenRoughnessFactor),e.sheenColorTexture&&K(n,e.sheenColorTexture,"pbr_sheenColorSampler",t,{featureOptions:{define:"HAS_SHEENCOLORMAP",enabledUniformName:"sheenColorMapEnabled"},gltf:r,attributes:i,textureTransformSlot:"sheenColor"}),e.sheenRoughnessTexture&&K(n,e.sheenRoughnessTexture,"pbr_sheenRoughnessSampler",t,{featureOptions:{define:"HAS_SHEENROUGHNESSMAP",enabledUniformName:"sheenRoughnessMapEnabled"},gltf:r,attributes:i,textureTransformSlot:"sheenRoughness"}))}function KA(n,e,t,r,i={}){e&&(e.iridescenceFactor!==void 0&&(t.uniforms.iridescenceFactor=e.iridescenceFactor),e.iridescenceIor!==void 0&&(t.uniforms.iridescenceIor=e.iridescenceIor),(e.iridescenceThicknessMinimum!==void 0||e.iridescenceThicknessMaximum!==void 0)&&(t.uniforms.iridescenceThicknessRange=[e.iridescenceThicknessMinimum??100,e.iridescenceThicknessMaximum??400]),e.iridescenceTexture&&K(n,e.iridescenceTexture,"pbr_iridescenceSampler",t,{featureOptions:{define:"HAS_IRIDESCENCEMAP",enabledUniformName:"iridescenceMapEnabled"},gltf:r,attributes:i,textureTransformSlot:"iridescence"}),e.iridescenceThicknessTexture&&K(n,e.iridescenceThicknessTexture,"pbr_iridescenceThicknessSampler",t,{featureOptions:{define:"HAS_IRIDESCENCETHICKNESSMAP"},gltf:r,attributes:i,textureTransformSlot:"iridescenceThickness"}))}function qA(n,e,t,r,i={}){e&&(e.anisotropyStrength!==void 0&&(t.uniforms.anisotropyStrength=e.anisotropyStrength),e.anisotropyRotation!==void 0&&(t.uniforms.anisotropyRotation=e.anisotropyRotation),e.anisotropyTexture&&K(n,e.anisotropyTexture,"pbr_anisotropySampler",t,{featureOptions:{define:"HAS_ANISOTROPYMAP",enabledUniformName:"anisotropyMapEnabled"},gltf:r,attributes:i,textureTransformSlot:"anisotropy"}))}function YA(n,e){(n==null?void 0:n.emissiveStrength)!==void 0&&(e.uniforms.emissiveStrength=n.emissiveStrength)}function K(n,e,t,r,i={}){var b,_;const{featureOptions:s={},gltf:o,attributes:a={},textureTransformSlot:c}=i,{define:l,enabledUniformName:u}=s,d=Ah(e);if(d>1){S.warn(`Skipping ${String(t)} because ${d} is not supported; only TEXCOORD_0 and TEXCOORD_1 are currently available`)();return}if(d===1&&!Te(a,"TEXCOORD_1")){S.warn(`Skipping ${String(t)} because it requires TEXCOORD_1 but the primitive does not provide TEXCOORD_1`)();return}const h=ZA(e,o),m=(_=(b=h.texture)==null?void 0:b.source)==null?void 0:_.image;if(!m){S.warn(`Skipping unresolved glTF texture for ${String(t)}`)();return}const p={id:h.uniformName||h.id,sampler:{addressModeU:"repeat",addressModeV:"repeat",minFilter:"linear",magFilter:"linear",...EA(h.texture.sampler)}},g=QA(n,m,p);if(r.bindings[t]=g,l&&(r.defines[l]=!0),u&&(r.uniforms[u]=!0),c){const y=Th(c);r.uniforms[y.uvSetUniform]=d,r.uniforms[y.uvTransformUniform]=Qo(Eh(e))}r.generatedTextures.push(g)}function QA(n,e,t){if("compressed"in e)return e1(n,e,{id:t.id,sampler:t.sampler});const r=t.width!==void 0&&t.height!==void 0?{width:t.width,height:t.height}:n.getExternalImageSize(e),i=t.sampler.mipmapFilter==="nearest"||t.sampler.mipmapFilter==="linear",s=i?n.getMipLevelCount(r.width,r.height):1,o=n.createTexture({id:t.id,sampler:t.sampler,width:r.width,height:r.height,mipLevels:s,...i?{usage:N.SAMPLE|N.RENDER|N.COPY_DST|N.COPY_SRC}:{},...t.colorSpace?{format:t.colorSpace==="srgb"?"rgba8unorm-srgb":"rgba8unorm"}:{},data:e});return s>1&&(n.type==="webgl"?o.generateMipmapsWebGL():n.type==="webgpu"&&n.generateMipmapsWebGPU(o)),o}function ZA(n,e){if(n.texture||n.index===void 0||!(e!=null&&e.textures))return n;const t=e.textures[n.index];return t?"texture"in t&&t.texture?{...t,...n,texture:t.texture}:"source"in t?{...n,texture:t}:n:n}function Cr(n,e){return n.createTexture({...e,format:"rgba8unorm",width:1,height:1,mipLevels:1})}function du(n){return n.textureFormat}function JA(n,e,t){const{blockWidth:r=1,blockHeight:i=1}=xe.getInfo(t);let s=1;for(let o=1;;o++){const a=Math.max(1,n>>o),c=Math.max(1,e>>o);if(a<r||c<i)break;s++}return s}function e1(n,e,t){var h,m;let r;if(Array.isArray(e.data)&&((h=e.data[0])!=null&&h.data)?r=e.data:"mipmaps"in e&&Array.isArray(e.mipmaps)?r=e.mipmaps:r=[],r.length===0||!((m=r[0])!=null&&m.data))return S.warn("createCompressedTexture: compressed image has no valid mip levels, creating fallback")(),Cr(n,t);const i=r[0],s=i.width??e.width??0,o=i.height??e.height??0;if(s<=0||o<=0)return S.warn("createCompressedTexture: base level has invalid dimensions, creating fallback")(),Cr(n,t);const a=du(i);if(!a)return S.warn("createCompressedTexture: compressed image has no textureFormat, creating fallback")(),Cr(n,t);if(!n.isTextureFormatSupported(a))return S.warn(`createCompressedTexture: ${n.type} device does not support '${a}', creating fallback`)(),Cr(n,t);const c=JA(s,o,a),l=Math.min(r.length,c);let u=1;for(let p=1;p<l;p++){const g=r[p];if(!g.data||g.width<=0||g.height<=0){S.warn(`createCompressedTexture: mip level ${p} has invalid data/dimensions, truncating`)();break}const b=du(g);if(b&&b!==a){S.warn(`createCompressedTexture: mip level ${p} format '${b}' differs from base '${a}', truncating`)();break}const _=Math.max(1,s>>p),y=Math.max(1,o>>p);if(g.width!==_||g.height!==y){S.warn(`createCompressedTexture: mip level ${p} dimensions ${g.width}x${g.height} don't match expected ${_}x${y}, truncating`)();break}u++}const d=n.createTexture({...t,format:a,usage:N.TEXTURE|N.COPY_DST,width:s,height:o,mipLevels:u,data:i.data});for(let p=1;p<u;p++)d.writeData(r[p].data,{width:r[p].width,height:r[p].height,mipLevel:p});return d}const t1={modelOptions:{},pbrDebug:!1,imageBasedLightingEnvironment:void 0,lights:!0,useTangents:!1,useByteColors:!0,strictExtensions:!1};function n1(n,e,t={}){const r=new Set,i={...t1,...t,generatedTextures:r},s=new Va(n,{modules:[Na]}),o=(e.materials||[]).map((g,b)=>Sh(n,{id:c1(g,b),parsedPPBRMaterial:Zo(n,g,{},{...i,gltf:e,validateAttributes:!1}),materialFactory:s})),a=new Map;(e.materials||[]).forEach((g,b)=>{a.set(g.id,o[b])});const c=new Map;e.meshes.forEach((g,b)=>{const _=Xs(n,g,e,a,i);c.set(g.id,_)});const l=new Map,u=new Map,d=new Set,h=new Set,m=new Set;return e.nodes.forEach((g,b)=>{const _=r1(n,g);l.set(b,_),u.set(g.id,_)}),e.nodes.forEach((g,b)=>{var _,y,v,w;if(l.get(b).add((g.children??[]).map(({id:x})=>{const T=u.get(x);if(!T)throw new Error(`Cannot find child ${x} of node ${b}`);return T})),g.mesh){const x=g.mesh,T=bA(e,g),A=x.primitives.some(P=>{var R;return!!((R=P.targets)!=null&&R.length)}),M=T||A&&d.has(x.id)?Xs(n,x,e,a,i,T||void 0):c.get(x.id);if(!M)throw new Error(`Cannot find mesh child ${g.mesh.id} of node ${b}`);const L=l.get(b),C=c.get(x.id),B=h.has(x.id)&&(g.skin!==void 0||m.has(x.id))&&M===C?Xs(n,x,e,a,i):M;if(L.add(B),L.userData.gltfMesh=B,h.add(x.id),g.skin!==void 0&&m.add(x.id),A){d.add(x.id);const P=((y=(_=x.primitives.find(H=>{var re;return(re=H.targets)==null?void 0:re.length}))==null?void 0:_.targets)==null?void 0:y.length)||0,R=g.weights||x.weights||new Array(P).fill(0);L.userData.morphMeshes=[B],(w=(v=i.modelOptions)==null?void 0:v.userData)!=null&&w.gltfAnimatedCrowd?L.userData.morphWeights=[...R]:wh(L,R)}}}),{scenes:e.scenes.map(g=>{const b=(g.nodes||[]).map(({id:_})=>{const y=u.get(_);if(!y)throw new Error(`Cannot find child ${_} of scene ${g.name||g.id}`);return y});return new Re({id:g.name||g.id,children:b})}),materials:o,gltfMeshIdToNodeMap:c,gltfNodeIdToNodeMap:u,gltfNodeIndexToNodeMap:l,generatedTextures:r}}function Zo(n,e,t,r){const i=MA(n,e,t,r);for(const s of i.generatedTextures)r.generatedTextures.add(s);return i}function r1(n,e,t){var r,i;return new Re({id:e.name||e.id,children:[],matrix:e.matrix,display:((i=(r=e.extensions)==null?void 0:r.KHR_node_visibility)==null?void 0:i.visible)!==!1,position:e.translation,rotation:e.rotation,scale:e.scale})}function Xs(n,e,t,r,i,s){const a=(e.primitives||[]).map((l,u)=>i1({device:n,gltfPrimitive:l,primitiveIndex:u,gltfMesh:e,gltf:t,gltfMaterialIdToMaterialMap:r,options:i,instancing:s}));return new Re({id:e.name||e.id,children:a})}function i1({device:n,gltfPrimitive:e,primitiveIndex:t,gltfMesh:r,gltf:i,gltfMaterialIdToMaterialMap:s,options:o,instancing:a}){var _,y,v;const c=e.name||`${r.name||r.id}-primitive-${t}`,l=o1(e.attributes),u=vA(e.mode??4,(_=e.indices)==null?void 0:_.value,l),d=a1(c,e,u),h=d.vertexCount,m=s1(e,i,d),p=Zo(n,e.material,d.attributes,{...o,gltf:i}),g=mA(n,{id:c,geometry:d,material:e.material&&s.get(e.material.id)||null,parsedPPBRMaterial:p,modelOptions:o.modelOptions,vertexCount:h,bounds:[e.attributes.POSITION.min,e.attributes.POSITION.max],instanceMatrices:a==null?void 0:a.matrices,morphTargets:m==null?void 0:m.targets});a&&(g.userData.gltfInstancing=a);const b=((v=(y=e.extensions)==null?void 0:y.KHR_materials_variants)==null?void 0:v.mappings)||[];if(b.length){const w=new Map;for(const x of b){const T=typeof x.material=="number"?i.materials[x.material]:x.material,A=T&&s.get(T.id);if(!A)continue;const M=Zo(n,T,d.attributes,{...o,gltf:i});for(const L of x.variants||[])w.set(L,{material:A,parameters:{...g.model.parameters,...M.parameters,depthWriteEnabled:T.alphaMode!=="BLEND",cullMode:T.doubleSided?"none":"back"}})}g.userData.gltfMaterialVariants={defaultMaterial:g.model.material,defaultParameters:{...g.model.parameters},mappings:w}}return m&&(g.userData.morphTargets=m),g}function s1(n,e,t){var s,o;if(!((s=n.targets)!=null&&s.length))return;const r={};for(const a of["POSITION","NORMAL","TANGENT"]){const c=(o=t.attributes[a])==null?void 0:o.value;c instanceof Float32Array&&(r[a]=new Float32Array(c))}const i=n.targets.map(a=>{const c={};for(const l of["POSITION","NORMAL","TANGENT"]){const u=a[l],d=typeof u=="number"?e.accessors[u]:u;d!=null&&d.value&&ArrayBuffer.isView(d.value)&&(c[l]=$a(d))}return c});return{geometry:t,baseAttributes:r,targets:i}}function o1(n){let e=1/0;for(const t of Object.values(n))if(t){const{value:r,size:i,components:s}=t,o=i??s;(r==null?void 0:r.length)!==void 0&&o>=1&&(e=Math.min(e,r.length/o))}if(!Number.isFinite(e))throw new Error("Could not determine vertex count from attributes");return e}function a1(n,e,t){var i,s;const r={};for(const[o,a]of Object.entries(e.attributes)){const{components:c,size:l,value:u,normalized:d}=a,h=o==="POSITION"||o==="NORMAL"||o==="TANGENT",m=!!((i=e.targets)!=null&&i.length&&h);r[o]={size:l??c,value:m?$a({value:u,normalized:d}):u,normalized:m?!1:d}}return new ka({id:n,topology:t.topology,indices:t.indices??((s=e.indices)==null?void 0:s.value),attributes:r})}function c1(n,e){return n.name||n.id||`material-${e}`}function hu(n,e={}){var o,a,c,l;const t=e.lightDefinitions||n.lights||((a=(o=n.extensions)==null?void 0:o.KHR_lights_punctual)==null?void 0:a.lights);if(!t||!Array.isArray(t)||t.length===0)return[];const r=[],i=m1(n.nodes||[]),s=new Map;for(const u of n.nodes||[]){if(!l1(u,i,e.nodeVisibility))continue;const d=u.light??((l=(c=u.extensions)==null?void 0:c.KHR_lights_punctual)==null?void 0:l.light);if(typeof d!="number"||e.nodeIdentifiers&&!e.nodeIdentifiers.has(u.id))continue;const h=t[d];if(!h)continue;const m=u1(h.color||[1,1,1],e.useByteColors??!0),p=h.intensity??1,g=h.range,b=Rh(u,i,s);switch(h.type){case"directional":r.push(d1(b,m,p));break;case"point":r.push(f1(b,m,p,g));break;case"spot":r.push(h1(b,m,p,g,h.spot));break}}return r}function l1(n,e,t){var i,s;let r=n;for(;r;){const o=t==null?void 0:t.get(r.id);if(o?!o.display:((s=(i=r.extensions)==null?void 0:i.KHR_node_visibility)==null?void 0:s.visible)===!1)return!1;r=e.get(r.id)}return!0}function u1(n,e){return e?n.map(t=>t*255):Ba(n,!1)}function f1(n,e,t,r){const i=Ih(n);let s=[1,0,0];return r!==void 0&&r>0&&(s=[1,0,1/(r*r)]),{type:"point",position:i,color:e,intensity:t,attenuation:s}}function d1(n,e,t){return{type:"directional",direction:Mh(n),color:e,intensity:t}}function h1(n,e,t,r,i={}){const s=Ih(n),o=Mh(n);let a=[1,0,0];return r!==void 0&&r>0&&(a=[1,0,1/(r*r)]),{type:"spot",position:s,direction:o,color:e,intensity:t,attenuation:a,innerConeAngle:i.innerConeAngle??0,outerConeAngle:i.outerConeAngle??Math.PI/4}}function m1(n){const e=new Map;for(const t of n)for(const r of t.children||[])e.set(r.id,t);return e}function Rh(n,e,t){const r=t.get(n.id);if(r)return r;const i=p1(n),s=e.get(n.id),o=s?new $(Rh(s,e,t)).multiplyRight(i):i;return t.set(n.id,o),o}function p1(n){if(n.matrix)return new $(n.matrix);const e=new $;return n.translation&&e.translate(n.translation),n.rotation&&e.multiplyRight(new $().fromQuaternion(n.rotation)),n.scale&&e.scale(n.scale),e}function Ih(n){return n.transformAsPoint([0,0,0])}function Mh(n){return n.transformDirection([0,0,-1])}class g1 extends dw{constructor(t){var r;super({name:t.animation.name||"unnamed"});f(this,"animation");f(this,"gltfNodeIdToNodeMap");f(this,"onVisibilityChange");f(this,"cameras");f(this,"lightDefinitions");f(this,"onLightChange");f(this,"materials");f(this,"clip");f(this,"mixer");f(this,"action");f(this,"materialTextureTransformState",new Map);if(this.animation=t.animation,this.gltfNodeIdToNodeMap=t.gltfNodeIdToNodeMap,this.onVisibilityChange=t.onVisibilityChange,this.cameras=t.cameras||[],this.lightDefinitions=t.lightDefinitions||[],this.onLightChange=t.onLightChange,this.materials=t.materials||[],(r=this.animation).name||(r.name="unnamed"),this.name=this.animation.name,this.animation.channels.some(i=>i.type==="material"||i.type==="textureTransform")&&!this.materials.length)throw new Error(`Animation ${this.animation.name} targets materials, but GLTFAnimator was created without a materials array`);this.mixer=t.mixer||new Id,this.clip=new bw({name:this.name,tracks:this.animation.channels.map(i=>this.createAnimationTrack(i))}),this.action=this.mixer.clipAction(this.clip).play()}applyTime(t){this.action.setTime(t),this.mixer.update(0)}createAnimationTrack(t){const r=_1(t.sampler.interpolation);if(t.type==="node")return new Ss({name:`${t.targetNodeId}.${t.path}`,times:t.sampler.input,values:t.sampler.output,interpolation:r,valueType:t.path==="rotation"?"quaternion":"vector",binding:{id:`node:${t.targetNodeId}:${t.path}`,getValue:()=>this.getNodeAnimationValue(t.targetNodeId,t.path),setValue:s=>this.applyNodeAnimationValue(t.targetNodeId,t.path,s)}});if(t.type==="camera"||t.type==="light")return new Ss({name:t.pointer,times:t.sampler.input,values:t.sampler.output,interpolation:r,binding:{id:t.pointer,getValue:()=>this.getSceneAnimationValue(t),setValue:s=>this.applySceneAnimationValue(t,s)}});const i=this.materials[t.targetMaterialIndex];if(!i)throw new Error(`Cannot find animation target material ${t.targetMaterialIndex} for ${t.pointer}`);return new Ss({name:t.pointer,times:t.sampler.input,values:t.sampler.output,interpolation:r,binding:{id:t.pointer,getValue:t.type==="material"?()=>y1(i,t):void 0,setValue:s=>{t.type==="material"?v1(i,t,s):w1(i,t,s,this.materialTextureTransformState)}}})}getNodeAnimationValue(t,r){const i=this.getTargetNode(t);switch(r){case"translation":return Array.from(i.position);case"rotation":return Array.from(i.rotation);case"scale":return Array.from(i.scale);case"weights":return Array.from(i.userData.morphWeights||[]);case"visibility":return[i.display?1:0];default:return[]}}applyNodeAnimationValue(t,r,i){var o;const s=this.getTargetNode(t);switch(r){case"translation":s.setPosition(i).updateMatrix();break;case"rotation":s.setRotation(i).updateMatrix();break;case"scale":s.setScale(i).updateMatrix();break;case"weights":wh(s,i);break;case"visibility":s.setProps({display:i[0]!==0}),(o=this.onVisibilityChange)==null||o.call(this);break;default:S.warn(`Bad animation path ${r}`)()}}getTargetNode(t){const r=this.gltfNodeIdToNodeMap.get(t);if(!r)throw new Error(`Cannot find animation target node ${t}`);return r}getSceneAnimationValue(t){var s,o;if(t.type==="camera"){const a=this.cameras[t.targetCameraIndex],c=(s=a==null?void 0:a[t.projection])==null?void 0:s[t.property];return typeof c=="number"?[c]:[]}const r=this.lightDefinitions[t.targetLightIndex],i=t.property==="innerConeAngle"||t.property==="outerConeAngle"?(o=r==null?void 0:r.spot)==null?void 0:o[t.property]:r==null?void 0:r[t.property];return Array.isArray(i)?t.component===void 0?[...i]:[i[t.component]]:typeof i=="number"?[i]:[]}applySceneAnimationValue(t,r){var s;if(t.type==="camera"){const o=this.cameras[t.targetCameraIndex];o!=null&&o[t.projection]&&(o[t.projection][t.property]=r[0]);return}const i=this.lightDefinitions[t.targetLightIndex];if(i){if(t.property==="innerConeAngle"||t.property==="outerConeAngle")i.spot||(i.spot={}),i.spot[t.property]=r[0];else if(t.component!==void 0){const o=[...i[t.property]||[1,1,1]];o[t.component]=r[0],i[t.property]=o}else i[t.property]=r.length===1?r[0]:[...r];(s=this.onLightChange)==null||s.call(this)}}}class b1 extends hw{constructor(t){var i;const r=new Id;super(t.animations.map((s,o)=>{const a=s.name||`Animation-${o}`;return new g1({gltfNodeIdToNodeMap:t.gltfNodeIdToNodeMap,onVisibilityChange:t.onVisibilityChange,cameras:t.cameras,lightDefinitions:t.lightDefinitions,onLightChange:t.onLightChange,materials:t.materials,mixer:r,animation:{name:a,channels:s.channels}})}));f(this,"mixer");f(this,"activeClip");f(this,"onUpdate");f(this,"previousTimeSeconds");this.mixer=r,this.onUpdate=t.onUpdate,this.activeClip=(i=this.clips[0])==null?void 0:i.name,t.autoplay===!1?this.clips.forEach(s=>{s.playing=!1,s.action.stop()}):t.autoplay==="first"&&this.activeClip&&this.selectClip(this.activeClip)}setUpdateHandler(t){return this.onUpdate=t,this}setTime(t){var o;const r=t/1e3,i=this.previousTimeSeconds===void 0?0:r-this.previousTimeSeconds;this.previousTimeSeconds=r;const s=i*this.mixer.timeScale;this.clips.forEach(a=>{if(!a.playing){a.action.stop();return}if(a.action.paused)return;a.action.resume();const c=Math.max(0,r-a.startTime)*a.speed;a.action.setTime(c-s*a.action.timeScale)}),this.mixer.update(i),(o=this.onUpdate)==null||o.call(this)}update(t){var r;this.mixer.update(t),(r=this.onUpdate)==null||r.call(this)}selectClip(t,r={}){const i=this.clips.find(a=>a.name===t);if(!i)throw new Error(`Unknown animation clip: ${t}`);const s=this.clips.find(a=>a.name===this.activeClip),o=r.crossFadeDuration||0;for(const a of this.clips)a!==i&&!(o>0&&a===s)&&(a.playing=!1,a.action.stop());return i.playing=!0,o>0&&s&&s!==i?(s.playing=!0,s.action.crossFadeTo(i.action,o)):i.action.reset().setEffectiveWeight(1).play(),this.activeClip=t,i}}function _1(n){switch(n){case"STEP":case"LINEAR":case"CUBICSPLINE":return n;default:throw new Error(`Unsupported animation interpolation: ${n}`)}}function y1(n,e){var i;const r=(i=n.shaderInputs.getUniformValues().pbrMaterial)==null?void 0:i[e.property];return Array.isArray(r)?e.component===void 0?[...r]:[r[e.component]]:typeof r=="number"?[r]:[]}function v1(n,e,t){const r=e.component!==void 0?{[e.property]:S1(x1(n,e.property),e.component,t[0])}:{[e.property]:t.length===1?t[0]:t};n.setProps({pbrMaterial:r})}function x1(n,e){var i;const r=(i=n.shaderInputs.getUniformValues().pbrMaterial)==null?void 0:i[e];return Array.isArray(r)?[...r]:[]}function S1(n,e,t){const r=[...n];return r[e]=t,r}function w1(n,e,t,r){const i=Th(e.textureSlot),s=T1(r,n,e);switch(e.path){case"offset":e.component!==void 0?s.offset[e.component]=t[0]:s.offset=[t[0],t[1]];break;case"rotation":s.rotation=t[0];break;case"scale":e.component!==void 0?s.scale[e.component]=t[0]:s.scale=[t[0],t[1]];break}n.setProps({pbrMaterial:{[i.uvTransformUniform]:TA(e.baseTransform,s)}})}function T1(n,e,t){const r=n.get(e)||{};let i=r[t.textureSlot];return i||(i={offset:[...t.baseTransform.offset],rotation:t.baseTransform.rotation,scale:[...t.baseTransform.scale]},r[t.textureSlot]=i,n.set(e,r)),i}class E1{constructor(e){f(this,"bindings");f(this,"scenes");this.scenes=e.scenes,this.bindings=A1(e),this.update()}update(){if(this.bindings.length===0)return;const e=new Map;for(const t of this.scenes)t.preorderTraversal((r,{worldMatrix:i})=>{r instanceof Re&&e.set(r,new $(i))});for(const t of this.bindings){Rw({joints:t.joints,meshNode:t.node,worldMatrices:e,inverseBindMatrices:t.inverseBindMatrices,target:t.jointMatrices});for(const r of t.models)r.model.shaderInputs.setProps({skin:{jointMatrices:t.jointMatrices}})}}getBinding(e){return this.bindings.find(t=>typeof e=="number"?t.nodeIndex===e:t.node===e)}}function A1(n){var o;const{gltf:e,gltfNodeIndexToNodeMap:t}=n,r=[],i=e.skins||[],s=new Set;for(const a of n.scenes)a.preorderTraversal(c=>{c instanceof Re&&s.add(c)});for(const[a,c]of e.nodes.entries()){const l=c.skin;if(l===void 0||!c.mesh)continue;const u=R1(e,l),d=i[u],h=t.get(a);if(!d||!h||!s.has(h))continue;const m=d.joints.flatMap(v=>{const w=t.get(v);return w?[w]:[]});if(m.length!==d.joints.length)continue;const p=c.mesh,g=h.userData.gltfMesh,b=g instanceof Re?g:h.children.find(v=>v instanceof Re&&v.id===(p.name||p.id));if(!(b instanceof Re))continue;const _=b.children.flatMap(v=>v instanceof Jn?[v]:[]),y=(o=d.inverseBindMatrices)==null?void 0:o.value;r.push({nodeIndex:a,skinIndex:u,node:h,joints:m,...y instanceof Float32Array?{inverseBindMatrices:y}:{},jointMatrices:new Float32Array(m.length*16),models:_})}return r}function R1(n,e){return typeof e=="number"?e:(n.skins||[]).findIndex(t=>{var r;if(t===e||e.id&&t.id===e.id)return!0;if(t.joints.length!==((r=e.joints)==null?void 0:r.length)||!t.joints.every((i,s)=>{var o;return i===((o=e.joints)==null?void 0:o[s])}))return!1;if(typeof e.inverseBindMatrices=="number"){const i=n.accessors[e.inverseBindMatrices];return!t.inverseBindMatrices||t.inverseBindMatrices===i}return!0})}const I1={supportLevel:"none",standardStatus:"unknown",comment:"Not currently listed in the luma.gl glTF extension support registry."},Lh={KHR_draco_mesh_compression:{supportLevel:"built-in",standardStatus:"ratified",comment:"Decoded by loaders.gl before luma.gl builds the scenegraph."},EXT_meshopt_compression:{supportLevel:"built-in",standardStatus:"ratified",comment:"EXT meshopt-compressed buffer views are decoded by loaders.gl before rendering."},KHR_meshopt_compression:{supportLevel:"none",standardStatus:"release-candidate",comment:"The installed loaders.gl GLTFLoader supports EXT_meshopt_compression, not the KHR release candidate."},KHR_mesh_quantization:{supportLevel:"built-in",standardStatus:"ratified",comment:"Loader-materialized quantized accessors retain their typed values and normalization."},EXT_mesh_features:{supportLevel:"loader-only",standardStatus:"ratified",comment:"Feature identifiers are decoded by loaders.gl; automatic rendering and picking are application-owned."},EXT_structural_metadata:{supportLevel:"loader-only",standardStatus:"ratified",comment:"Structural metadata is decoded by loaders.gl; automatic rendering and querying are application-owned."},KHR_lights_punctual:{supportLevel:"built-in",standardStatus:"ratified",comment:"Parsed into luma.gl Light objects."},KHR_materials_unlit:{supportLevel:"built-in",standardStatus:"ratified",comment:"Unlit materials bypass the default lighting path."},KHR_materials_emissive_strength:{supportLevel:"built-in",standardStatus:"ratified",comment:"Applied by the stock PBR shader."},KHR_texture_basisu:{supportLevel:"built-in",standardStatus:"ratified",comment:"BasisU / KTX2 textures pass through when the device supports them."},KHR_texture_transform:{supportLevel:"built-in",standardStatus:"ratified",comment:"Per-slot UV transforms and animated pointers are applied at runtime; avoid duplicate legacy loader-side baking."},EXT_texture_webp:{supportLevel:"loader-only",standardStatus:"ratified",comment:"Texture source is resolved during load; final support depends on browser and device decode support."},EXT_texture_avif:{supportLevel:"none",standardStatus:"ratified",comment:"The image loader can decode supported AVIF images, but GLTFLoader does not select EXT_texture_avif sources."},KHR_materials_specular:{supportLevel:"built-in",standardStatus:"ratified",comment:"The stock shader now applies specular factors and textures to the dielectric F0 term."},KHR_materials_ior:{supportLevel:"built-in",standardStatus:"ratified",comment:"The stock shader now drives dielectric reflectance from the glTF IOR value."},KHR_materials_transmission:{supportLevel:"built-in",standardStatus:"ratified",comment:"The stock shader now applies transmission to the base layer and exposes transparency through alpha, without a scene-color refraction buffer."},KHR_materials_volume:{supportLevel:"built-in",standardStatus:"ratified",comment:"Thickness and attenuation now tint transmitted light in the stock shader."},KHR_materials_clearcoat:{supportLevel:"built-in",standardStatus:"ratified",comment:"The stock shader now adds a secondary clearcoat specular lobe."},KHR_materials_sheen:{supportLevel:"built-in",standardStatus:"ratified",comment:"The stock shader now adds a sheen lobe for cloth-like materials."},KHR_materials_iridescence:{supportLevel:"built-in",standardStatus:"ratified",comment:"The stock shader now tints specular response with a view-dependent thin-film iridescence approximation."},KHR_materials_anisotropy:{supportLevel:"built-in",standardStatus:"ratified",comment:"The stock shader now shapes highlights and IBL response with an anisotropy-direction approximation."},KHR_materials_pbrSpecularGlossiness:{supportLevel:"loader-only",standardStatus:"archived",comment:"Extension data can be loaded, but it is not translated into the default metallic-roughness material path."},KHR_materials_variants:{supportLevel:"parsed-and-wired",standardStatus:"ratified",comment:"Primitive material variants can be selected and restored on the generated scenegraph."},EXT_mesh_gpu_instancing:{supportLevel:"built-in",standardStatus:"ratified",comment:"Accessor-backed instance transforms use one instanced draw per source primitive."},KHR_node_visibility:{supportLevel:"parsed-and-wired",standardStatus:"ratified",comment:"Recursive node visibility controls rendered geometry, punctual lights, and animation."},KHR_animation_pointer:{supportLevel:"parsed-and-wired",standardStatus:"ratified",comment:"Node transforms, morph weights and visibility, material factors, texture transforms, camera projections, and punctual lights are wired to runtime updates."},EXT_materials_bump:{supportLevel:"built-in",standardStatus:"draft",comment:"The experimental bump-map draft perturbs the canonical surface normal from a linear height texture."},KHR_materials_diffuse_transmission:{supportLevel:"built-in",standardStatus:"release-candidate",comment:"The Khronos release candidate adds energy-conserving back-lit diffuse transmission and independent color/factor textures."},KHR_materials_dispersion:{supportLevel:"parsed-and-wired",standardStatus:"ratified",comment:"The canonical PBR shader separates red, green, and blue transmission using wavelength-dependent refraction."},KHR_materials_volume_scatter:{supportLevel:"parsed-and-wired",standardStatus:"draft",comment:"The unratified volume-scattering draft is approximated per surface; random-walk and screen-space diffusion are not implemented."},KHR_xmp:{supportLevel:"none",standardStatus:"archived",comment:"Metadata payloads remain in the loaded glTF, but luma.gl does not interpret them."},KHR_xmp_json_ld:{supportLevel:"none",standardStatus:"ratified",comment:"Metadata is preserved in the glTF, but luma.gl does not interpret it."},EXT_lights_image_based:{supportLevel:"none",standardStatus:"multi-vendor",comment:"Use loadPBREnvironment() or custom environment setup instead."},EXT_texture_video:{supportLevel:"none",standardStatus:"multi-vendor",comment:"Video textures are not created automatically by the stock pipeline."},MSFT_lod:{supportLevel:"parsed-and-wired",standardStatus:"vendor",comment:"Node levels are parsed and selected by opt-in animated crowds; material LOD and GPU-driven selection are not implemented."}};function Ch(n,e){const t=Array.from(B1(n)).sort(),r=new Set(n.extensionsRequired||[]),i=t.map(s=>{const o=Lh[s]||I1,a=C1(s,o,n,e);return[s,{extensionName:s,required:r.has(s),supported:N1(a.supportLevel),supportLevel:a.supportLevel,standardStatus:o.standardStatus,comment:a.comment}]});return new Map(i)}function M1(n,e){return Array.from(Ch(n,e).values()).filter(t=>t.required&&!t.supported)}function L1(n,e){const t=M1(n,e);if(t.length)throw new Error(`Unsupported required glTF extensions: ${t.map(r=>r.extensionName).join(", ")}`)}function C1(n,e,t,r){if(n!=="KHR_texture_basisu"||!r)return e;const s=P1(t).find(o=>o===null||!r.isTextureFormatSupported(o));return s===void 0?e:{supportLevel:"none",comment:s===null?`The ${r.type} device cannot use a BasisU texture whose transcoded GPU format is missing.`:`The ${r.type} device does not support the transcoded BasisU texture format '${s}'.`}}function P1(n){var t;const e=[];for(const r of n.textures||[]){const i=(t=r==null?void 0:r.source)==null?void 0:t.image;if(!(i!=null&&i.compressed))continue;const s=Array.isArray(i.data)?i.data[0]:Array.isArray(i.mipmaps)?i.mipmaps[0]:void 0;e.push((s==null?void 0:s.textureFormat)??null)}return e}function Ph(n){return Lh[n]||null}function B1(n){var r;const e=n,t=new Set;return Pr(t,n.extensionsUsed),Pr(t,n.extensionsRequired),Pr(t,e.extensionsRemoved),Pr(t,Object.keys(n.extensions||{})),((r=e.lights)!=null&&r.length||(n.nodes||[]).some(i=>"light"in i))&&t.add("KHR_lights_punctual"),(n.materials||[]).some(i=>{var o;const s=i;return s.unlit||((o=s.extensions)==null?void 0:o.KHR_materials_unlit)})&&t.add("KHR_materials_unlit"),t}function Pr(n,e=[]){for(const t of e)n.add(t)}function N1(n){return n==="built-in"||n==="parsed-and-wired"}function O1(n){const e=n.animations||[],t=new Map,r=new Map;return e.flatMap((i,s)=>{const o=i.name||`Animation-${s}`,a=new Map,c=i.channels.flatMap(({sampler:l,target:u})=>{const d=V1(n,u),h=`${l}:${d??0}`;let m=a.get(h);if(!m){const g=i.samplers[l];if(!g)throw new Error(`Cannot find animation sampler ${l}`);const{input:b,interpolation:_="LINEAR",output:y}=g,v=q1(n.accessors[b],t),w=Y1(n.accessors[y],r);m={input:v,interpolation:_,output:d!==void 0?G1(w,v.length,_,d):w},a.set(h,m)}const p=F1(n,u,m);return p?[p]:[]});return c.length?[{name:o,channels:c}]:[]})}function F1(n,e,t){if(e.path==="pointer")return U1(n,e,t);const r=Bh(e.path);if(!r)return null;const i=n.nodes[e.node??0];if(!i)throw new Error(`Cannot find animation target ${e.node}`);return{type:"node",sampler:t,targetNodeId:i.id,path:r}}function U1(n,e,t){var s,o;const r=(o=(s=e.extensions)==null?void 0:s.KHR_animation_pointer)==null?void 0:o.pointer;if(typeof r!="string"||!r.startsWith("/"))return S.warn("KHR_animation_pointer channel is missing a valid JSON pointer and will be skipped")(),null;const i=X1(r);switch(i[0]){case"nodes":return $1(n,i,t,r);case"materials":return z1(n,i,t,r);case"cameras":return D1(n,i,t,r);case"extensions":if(i[1]==="KHR_lights_punctual")return k1(n,i,t,r);break}return Qe(r,`top-level target "${i[0]}" has no runtime animation mapping`),null}function D1(n,e,t,r){var u;const i=Number(e[1]),s=(u=n.cameras)==null?void 0:u[i],o=e[2],a=e[3],c=["aspectRatio","yfov","znear","zfar"],l=["xmag","ymag","znear","zfar"];return e.length!==4||!Number.isInteger(i)||!s||o!=="perspective"&&o!=="orthographic"||s.type!==o||!(o==="perspective"?c:l).includes(a)?(Qe(r,"camera pointers must target a supported projection property"),null):{type:"camera",sampler:t,pointer:r,targetCameraIndex:i,projection:o,property:a}}function k1(n,e,t,r){var d,h;const i=Number(e[3]),s=n.lights||((h=(d=n.extensions)==null?void 0:d.KHR_lights_punctual)==null?void 0:h.lights),o=e[4]==="spot",a=o?e[5]:e[4],c=!o&&a==="color"?e[5]:void 0,l=["color","intensity","range","innerConeAngle","outerConeAngle"],u=o||c!==void 0?6:5;return e[2]!=="lights"||e.length!==u||!Number.isInteger(i)||!Array.isArray(s)||!s[i]||!l.includes(a)||o&&a!=="innerConeAngle"&&a!=="outerConeAngle"||c!==void 0&&(!/^[0-2]$/.test(c)||a!=="color")?(Qe(r,"punctual-light pointers must target supported typed light properties"),null):{type:"light",sampler:t,pointer:r,targetLightIndex:i,property:a,...c===void 0?{}:{component:Number(c)}}}function $1(n,e,t,r){const i=e.length===5&&e[2]==="extensions"&&e[3]==="KHR_node_visibility"&&e[4]==="visible";if(e.length!==3&&!i)return Qe(r,"node pointers must target transforms, morph weights, or KHR_node_visibility.visible"),null;const s=Number(e[1]),o=n.nodes[s];if(!Number.isInteger(s)||!o)return S.warn(`KHR_animation_pointer target ${r} references a missing node and will be skipped`)(),null;if(i&&t.interpolation!=="STEP")return Qe(r,"boolean visibility animation requires STEP interpolation"),null;const a=i?"visibility":Bh(e[2]);return a?{type:"node",sampler:t,targetNodeId:o.id,path:a}:(Qe(r,`node property "${e[2]}" has no runtime animation mapping`),null)}function V1(n,e){var s,o,a,c,l,u,d;let t;if(e.path==="weights")t=e.node;else if(e.path==="pointer"){const h=(o=(s=e.extensions)==null?void 0:s.KHR_animation_pointer)==null?void 0:o.pointer,m=typeof h=="string"?/^\/nodes\/(\d+)\/weights$/.exec(h):null;if(!m)return;t=Number(m[1])}else return;const r=n.nodes[t??0],i=typeof(r==null?void 0:r.mesh)=="number"?n.meshes[r.mesh]:r==null?void 0:r.mesh;return((a=r==null?void 0:r.weights)==null?void 0:a.length)||((c=i==null?void 0:i.weights)==null?void 0:c.length)||((d=(u=(l=i==null?void 0:i.primitives)==null?void 0:l[0])==null?void 0:u.targets)==null?void 0:d.length)||1}function G1(n,e,t,r){const i=t==="CUBICSPLINE"?3:1,s=n.length/(Math.max(e,1)*i),o=r>1?r:Number.isInteger(s)&&s>1?s:r;if(o<=1)return n;const a=n.flat(),c=[];for(let l=0;l<a.length;l+=o)c.push(a.slice(l,l+o));return c}function z1(n,e,t,r){if(e.length<3)return Qe(r,"material pointers must include a material index and target property path"),null;const i=Number(e[1]),s=n.materials[i];if(!Number.isInteger(i)||!s)return S.warn(`KHR_animation_pointer target ${r} references a missing material and will be skipped`)(),null;const o=W1(s,e.slice(2));return"reason"in o?(Qe(r,o.reason),null):{sampler:t,pointer:r,targetMaterialIndex:i,...o}}function Bh(n){switch(n){case"translation":case"rotation":case"scale":case"weights":return n;default:return null}}function W1(n,e){var i,s,o,a,c,l,u,d,h,m,p,g,b,_,y,v,w,x,T,A,M,L,C,I;const t=H1(n,e);if(!("reason"in t)||t.reason!=="not-a-texture-transform-target")return t;switch(e.join("/")){case"pbrMetallicRoughness/baseColorFactor":return n.pbrMetallicRoughness?{type:"material",property:"baseColorFactor"}:{reason:k(e)};case"pbrMetallicRoughness/metallicFactor":return n.pbrMetallicRoughness?{type:"material",property:"metallicRoughnessValues",component:0}:{reason:k(e)};case"pbrMetallicRoughness/roughnessFactor":return n.pbrMetallicRoughness?{type:"material",property:"metallicRoughnessValues",component:1}:{reason:k(e)};case"normalTexture/scale":return n.normalTexture?{type:"material",property:"normalScale"}:{reason:k(e)};case"occlusionTexture/strength":return n.occlusionTexture?{type:"material",property:"occlusionStrength"}:{reason:k(e)};case"emissiveFactor":return{type:"material",property:"emissiveFactor"};case"alphaCutoff":return{type:"material",property:"alphaCutoff"};case"extensions/KHR_materials_specular/specularFactor":return(i=n.extensions)!=null&&i.KHR_materials_specular?{type:"material",property:"specularIntensityFactor"}:{reason:k(e)};case"extensions/KHR_materials_specular/specularColorFactor":return(s=n.extensions)!=null&&s.KHR_materials_specular?{type:"material",property:"specularColorFactor"}:{reason:k(e)};case"extensions/KHR_materials_ior/ior":return(o=n.extensions)!=null&&o.KHR_materials_ior?{type:"material",property:"ior"}:{reason:k(e)};case"extensions/EXT_materials_bump/bumpFactor":return(a=n.extensions)!=null&&a.EXT_materials_bump?{type:"material",property:"bumpFactor"}:{reason:k(e)};case"extensions/KHR_materials_diffuse_transmission/diffuseTransmissionFactor":return(c=n.extensions)!=null&&c.KHR_materials_diffuse_transmission?{type:"material",property:"diffuseTransmissionFactor"}:{reason:k(e)};case"extensions/KHR_materials_diffuse_transmission/diffuseTransmissionColorFactor":return(l=n.extensions)!=null&&l.KHR_materials_diffuse_transmission?{type:"material",property:"diffuseTransmissionColorFactor"}:{reason:k(e)};case"extensions/KHR_materials_volume_scatter/multiscatterColorFactor":case"extensions/KHR_materials_volume_scatter/multiscatterColor":return(u=n.extensions)!=null&&u.KHR_materials_volume_scatter?{type:"material",property:"multiscatterColorFactor"}:{reason:k(e)};case"extensions/KHR_materials_volume_scatter/scatterAnisotropy":return(d=n.extensions)!=null&&d.KHR_materials_volume_scatter?{type:"material",property:"scatterAnisotropy"}:{reason:k(e)};case"extensions/KHR_materials_dispersion/dispersion":return(h=n.extensions)!=null&&h.KHR_materials_dispersion?{type:"material",property:"dispersion"}:{reason:k(e)};case"extensions/KHR_materials_transmission/transmissionFactor":return(m=n.extensions)!=null&&m.KHR_materials_transmission?{type:"material",property:"transmissionFactor"}:{reason:k(e)};case"extensions/KHR_materials_volume/thicknessFactor":return(p=n.extensions)!=null&&p.KHR_materials_volume?{type:"material",property:"thicknessFactor"}:{reason:k(e)};case"extensions/KHR_materials_volume/attenuationDistance":return(g=n.extensions)!=null&&g.KHR_materials_volume?{type:"material",property:"attenuationDistance"}:{reason:k(e)};case"extensions/KHR_materials_volume/attenuationColor":return(b=n.extensions)!=null&&b.KHR_materials_volume?{type:"material",property:"attenuationColor"}:{reason:k(e)};case"extensions/KHR_materials_clearcoat/clearcoatFactor":return(_=n.extensions)!=null&&_.KHR_materials_clearcoat?{type:"material",property:"clearcoatFactor"}:{reason:k(e)};case"extensions/KHR_materials_clearcoat/clearcoatRoughnessFactor":return(y=n.extensions)!=null&&y.KHR_materials_clearcoat?{type:"material",property:"clearcoatRoughnessFactor"}:{reason:k(e)};case"extensions/KHR_materials_sheen/sheenColorFactor":return(v=n.extensions)!=null&&v.KHR_materials_sheen?{type:"material",property:"sheenColorFactor"}:{reason:k(e)};case"extensions/KHR_materials_sheen/sheenRoughnessFactor":return(w=n.extensions)!=null&&w.KHR_materials_sheen?{type:"material",property:"sheenRoughnessFactor"}:{reason:k(e)};case"extensions/KHR_materials_iridescence/iridescenceFactor":return(x=n.extensions)!=null&&x.KHR_materials_iridescence?{type:"material",property:"iridescenceFactor"}:{reason:k(e)};case"extensions/KHR_materials_iridescence/iridescenceIor":return(T=n.extensions)!=null&&T.KHR_materials_iridescence?{type:"material",property:"iridescenceIor"}:{reason:k(e)};case"extensions/KHR_materials_iridescence/iridescenceThicknessMinimum":return(A=n.extensions)!=null&&A.KHR_materials_iridescence?{type:"material",property:"iridescenceThicknessRange",component:0}:{reason:k(e)};case"extensions/KHR_materials_iridescence/iridescenceThicknessMaximum":return(M=n.extensions)!=null&&M.KHR_materials_iridescence?{type:"material",property:"iridescenceThicknessRange",component:1}:{reason:k(e)};case"extensions/KHR_materials_anisotropy/anisotropyStrength":return(L=n.extensions)!=null&&L.KHR_materials_anisotropy?{type:"material",property:"anisotropyStrength"}:{reason:k(e)};case"extensions/KHR_materials_anisotropy/anisotropyRotation":return(C=n.extensions)!=null&&C.KHR_materials_anisotropy?{type:"material",property:"anisotropyRotation"}:{reason:k(e)};case"extensions/KHR_materials_emissive_strength/emissiveStrength":return(I=n.extensions)!=null&&I.KHR_materials_emissive_strength?{type:"material",property:"emissiveStrength"}:{reason:k(e)};default:return{reason:k(e)}}}function H1(n,e){const t=e.lastIndexOf("extensions");if(t<0||e[t+1]!=="KHR_texture_transform"||t<1)return{reason:"not-a-texture-transform-target"};const r=wA(e.slice(0,t));if(!r)return{reason:K1(e.slice(0,t))};const i=j1(n,r.pathSegments);if(!i)return{reason:`texture-transform target "${e.slice(0,t).join("/")}" does not exist on the referenced material`};const s=e[t+2];if(s==="texCoord")return{reason:"animated KHR_texture_transform.texCoord is unsupported because texCoord selection is structural, not a runtime float/vector update"};if(s!=="offset"&&s!=="rotation"&&s!=="scale")return{reason:`KHR_texture_transform property "${s}" is not animatable; supported properties are offset, rotation, and scale`};const o=e[t+3];if(e.length>t+4)return{reason:`KHR_texture_transform.${s} does not support nested property paths`};let a;if(o!==void 0){if(a=Number(o),s==="rotation")return{reason:"KHR_texture_transform.rotation does not support component indices"};if(!Number.isInteger(a)||a<0||a>1)return{reason:`KHR_texture_transform.${s} component index "${o}" is invalid; only 0 and 1 are supported`}}return{type:"textureTransform",textureSlot:r.slot,path:s,component:a,baseTransform:Eh(i)}}function j1(n,e){let t=n;for(const r of e)if(t=t==null?void 0:t[r],!t)return null;return t}function X1(n){return n.slice(1).split("/").map(e=>e.replace(/~1/g,"/").replace(/~0/g,"~"))}function k(n){const e=Nh(n);if(e){const t=Ph(e);if((t==null?void 0:t.supportLevel)==="none")return`${e} is referenced by this pointer, but ${t.comment.charAt(0).toLowerCase()}${t.comment.slice(1)}`}return`no runtime target exists for material property "${n.join("/")}"`}function K1(n){const e=Nh(n);if(e){const t=Ph(e);if((t==null?void 0:t.supportLevel)==="none")return`${e} is referenced by this pointer, but ${t.comment.charAt(0).toLowerCase()}${t.comment.slice(1)}`}return`texture-transform target "${n.join("/")}" has no runtime texture-slot mapping`}function Nh(n){const e=n.indexOf("extensions"),t=n[e+1];return e>=0&&t?t:null}function Qe(n,e){S.warn(`KHR_animation_pointer target ${n} will be skipped because ${e}`)()}function q1(n,e){if(e.has(n))return e.get(n);const{value:t,components:r}=Oh(n);ci(r===1,"accessorToJsArray1D must have exactly 1 component");const i=Array.from(t);return e.set(n,i),i}function Y1(n,e){if(e.has(n))return e.get(n);const{value:t,components:r}=Oh(n);ci(r>=1,"accessorToJsArray2D must have at least 1 component");const i=[];for(let s=0;s<t.length;s+=r)i.push(Array.from(t.slice(s,s+r)));return e.set(n,i),i}function Oh(n){var i;if(n.value)return{value:n.value,components:n.components};const e=(i=n.bufferView)==null?void 0:i.data;ci(e!==void 0),ci(n.componentType===5126);const t=n.type==="SCALAR"?1:Number(n.type.slice(3));return{value:new Float32Array(e.buffer,e.byteOffset+(n.byteOffset||0),n.count*t),components:t}}function ci(n,e){if(!n)throw new Error(e)}class Q1{constructor(e,t){f(this,"variants");f(this,"names");f(this,"activeVariant",null);f(this,"modelNodes");var s,o;const r=((o=(s=e.extensions)==null?void 0:s.KHR_materials_variants)==null?void 0:o.variants)||[];this.variants=r.map((a,c)=>({name:a.name||`Variant-${c}`,index:c})),this.names=this.variants.map(a=>a.name);const i=new Set;for(const a of t)a.preorderTraversal(c=>{c instanceof Jn&&c.userData.gltfMaterialVariants&&i.add(c)});this.modelNodes=Array.from(i)}selectVariant(e){const t=this.variants.find(r=>r.name===e);if(!t)throw new Error(`Unknown glTF material variant: ${e}`);for(const r of this.modelNodes){const i=r.userData.gltfMaterialVariants,s=i.mappings.get(t.index);r.model.setMaterial((s==null?void 0:s.material)||i.defaultMaterial),r.model.setParameters((s==null?void 0:s.parameters)||i.defaultParameters)}this.activeVariant=e}resetVariant(){for(const e of this.modelNodes){const t=e.userData.gltfMaterialVariants;e.model.setMaterial(t.defaultMaterial),e.model.setParameters(t.defaultParameters)}this.activeVariant=null}}function AP(n,e,t){var M,L;t!=null&&t.strictExtensions&&L1(e,n);const{scenes:r,materials:i,gltfMeshIdToNodeMap:s,gltfNodeIdToNodeMap:o,gltfNodeIndexToNodeMap:a,generatedTextures:c}=n1(n,e,t),l=O1(e),d=(e.lights||((L=(M=e.extensions)==null?void 0:M.KHR_lights_punctual)==null?void 0:L.lights)||[]).map(C=>({...C,...Array.isArray(C.color)?{color:[...C.color]}:{},...C.spot?{spot:{...C.spot}}:{}})),h=(e.cameras||[]).map(C=>{const I={...C};return C.perspective&&(I.perspective={...C.perspective}),C.orthographic&&(I.orthographic={...C.orthographic}),I}),m={useByteColors:(t==null?void 0:t.useByteColors)??!0,nodeVisibility:o,lightDefinitions:d},p=hu(e,m),g=()=>{p.splice(0,p.length,...hu(e,m))},b=new b1({onVisibilityChange:g,cameras:h,lightDefinitions:d,onLightChange:g,animations:l,gltfNodeIdToNodeMap:o,materials:i}),_=new Q1(e,r),y=Ch(e,n),v=r.map(C=>Fh(C.getBounds())),w=Z1(v),x=new E1({gltf:e,scenes:r,gltfNodeIndexToNodeMap:a});b.setUpdateHandler(()=>x.update());let T=!1;return{scenes:r,materials:i,variants:_,cameras:h,animator:b,animations:l,lights:p,extensionSupport:y,sceneBounds:v,modelBounds:w,gltfMeshIdToNodeMap:s,gltfNodeIdToNodeMap:o,gltfNodeIndexToNodeMap:a,skins:x,gltf:e,destroy:()=>{if(T)return;T=!0;const C=new Set([...r,...s.values(),...o.values()]),I=new Set,B=new Set(i);for(const P of C)P.preorderTraversal(R=>{var H;R instanceof Jn&&(I.add(R),(H=R.model)!=null&&H.material&&B.add(R.model.material))});for(const P of I)P.destroy();for(const P of C)P.destroy();for(const P of B)P.destroy();for(const P of c)P.destroy();c.clear()}}}function Fh(n){if(!n)return{bounds:null,center:[0,0,0],size:[0,0,0],radius:.5,recommendedOrbitDistance:1};const e=[[n[0][0],n[0][1],n[0][2]],[n[1][0],n[1][1],n[1][2]]],t=[e[1][0]-e[0][0],e[1][1]-e[0][1],e[1][2]-e[0][2]],r=[e[0][0]+t[0]*.5,e[0][1]+t[1]*.5,e[0][2]+t[2]*.5],i=Math.max(t[0],t[1],t[2])*.5,s=Math.max(.5*Math.hypot(t[0],t[1],t[2]),.001);return{bounds:e,center:r,size:t,radius:s,recommendedOrbitDistance:Math.max(Math.max(i,.001)/Math.tan(Math.PI/6)*1.15,s*1.1)}}function Z1(n){let e=null;for(const t of n)if(t.bounds){if(!e){e=[[...t.bounds[0]],[...t.bounds[1]]];continue}for(let r=0;r<3;r++)e[0][r]=Math.min(e[0][r],t.bounds[0][r]),e[1][r]=Math.max(e[1][r],t.bounds[1][r])}return Fh(e)}function oe(n,e){if(!n)throw new Error(e||"assert failed: gltf")}const Uh={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},Dh={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},mu=["SCALAR","VEC2","VEC3","VEC4"],J1=[[Int8Array,5120],[Uint8Array,5121],[Int16Array,5122],[Uint16Array,5123],[Uint32Array,5125],[Float32Array,5126],[Float64Array,5130]],eR=new Map(J1),tR={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},nR={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},rR={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};function kh(n){return mu[n-1]||mu[0]}function zi(n){const e=eR.get(n.constructor);if(!e)throw new Error("Illegal typed array");return e}function li(n,e){const t=rR[n.componentType],r=tR[n.type],i=nR[n.componentType],s=n.count*r,o=n.count*r*i;oe(o>=0&&o<=e.byteLength);const a=Dh[n.componentType],c=Uh[n.type];return{ArrayType:t,length:s,byteLength:o,componentByteSize:a,numberOfComponentsInElement:c}}function iR(n,e,t){const r=n.bufferViews[t];oe(r);const i=r.buffer,s=e[i];oe(s);const o=(r.byteOffset||0)+s.byteOffset;return new Uint8Array(s.arrayBuffer,o,r.byteLength)}function sR(n,e,t){var g,b;const r=typeof t=="number"?(g=n.accessors)==null?void 0:g[t]:t;if(!r)throw new Error(`No gltf accessor ${JSON.stringify(t)}`);const i=(b=n.bufferViews)==null?void 0:b[r.bufferView||0];if(!i)throw new Error(`No gltf buffer view for accessor ${i}`);const{arrayBuffer:s,byteOffset:o}=e[i.buffer],a=(o||0)+(r.byteOffset||0)+(i.byteOffset||0),{ArrayType:c,length:l,componentByteSize:u,numberOfComponentsInElement:d}=li(r,i),h=u*d,m=i.byteStride||h;if(typeof i.byteStride>"u"||i.byteStride===h)return new c(s,a,l);const p=new c(l);for(let _=0;_<r.count;_++){const y=new c(s,a+_*m,d);p.set(y,_*d)}return p}function oR(){return{asset:{version:"2.0",generator:"loaders.gl"},buffers:[],extensions:{},extensionsRequired:[],extensionsUsed:[]}}class Q{constructor(e){f(this,"gltf");f(this,"sourceBuffers");f(this,"byteLength");this.gltf={json:(e==null?void 0:e.json)||oR(),buffers:(e==null?void 0:e.buffers)||[],images:(e==null?void 0:e.images)||[]},this.sourceBuffers=[],this.byteLength=0,this.gltf.buffers&&this.gltf.buffers[0]&&(this.byteLength=this.gltf.buffers[0].byteLength,this.sourceBuffers=[this.gltf.buffers[0]])}get json(){return this.gltf.json}getApplicationData(e){return this.json[e]}getExtraData(e){return(this.json.extras||{})[e]}hasExtension(e){const t=this.getUsedExtensions().find(i=>i===e),r=this.getRequiredExtensions().find(i=>i===e);return typeof t=="string"||typeof r=="string"}getExtension(e){const t=this.getUsedExtensions().find(i=>i===e),r=this.json.extensions||{};return t?r[e]:null}getRequiredExtension(e){return this.getRequiredExtensions().find(r=>r===e)?this.getExtension(e):null}getRequiredExtensions(){return this.json.extensionsRequired||[]}getUsedExtensions(){return this.json.extensionsUsed||[]}getRemovedExtensions(){return this.json.extensionsRemoved||[]}getObjectExtension(e,t){return(e.extensions||{})[t]}getScene(e){return this.getObject("scenes",e)}getNode(e){return this.getObject("nodes",e)}getSkin(e){return this.getObject("skins",e)}getMesh(e){return this.getObject("meshes",e)}getMaterial(e){return this.getObject("materials",e)}getAccessor(e){return this.getObject("accessors",e)}getTexture(e){return this.getObject("textures",e)}getSampler(e){return this.getObject("samplers",e)}getImage(e){return this.getObject("images",e)}getBufferView(e){return this.getObject("bufferViews",e)}getBuffer(e){return this.getObject("buffers",e)}getObject(e,t){if(typeof t=="object")return t;const r=this.json[e]&&this.json[e][t];if(!r)throw new Error(`glTF file error: Could not find ${e}[${t}]`);return r}getTypedArrayForBufferView(e){e=this.getBufferView(e);const t=e.buffer,r=this.gltf.buffers[t];oe(r);const i=(e.byteOffset||0)+r.byteOffset;return new Uint8Array(r.arrayBuffer,i,e.byteLength)}getTypedArrayForAccessor(e){const t=this.getAccessor(e);return sR(this.gltf.json,this.gltf.buffers,t)}getTypedArrayForImageData(e){e=this.getAccessor(e);const t=this.getBufferView(e.bufferView),i=this.getBuffer(t.buffer).data,s=t.byteOffset||0;return new Uint8Array(i,s,t.byteLength)}addApplicationData(e,t){return this.json[e]=t,this}addExtraData(e,t){return this.json.extras=this.json.extras||{},this.json.extras[e]=t,this}addObjectExtension(e,t,r){return e.extensions=e.extensions||{},e.extensions[t]=r,this.registerUsedExtension(t),this}setObjectExtension(e,t,r){const i=e.extensions||{};i[t]=r}removeObjectExtension(e,t){const r=(e==null?void 0:e.extensions)||{};if(r[t]){this.json.extensionsRemoved=this.json.extensionsRemoved||[];const i=this.json.extensionsRemoved;i.includes(t)||i.push(t)}delete r[t]}addExtension(e,t={}){return oe(t),this.json.extensions=this.json.extensions||{},this.json.extensions[e]=t,this.registerUsedExtension(e),t}addRequiredExtension(e,t={}){return oe(t),this.addExtension(e,t),this.registerRequiredExtension(e),t}registerUsedExtension(e){this.json.extensionsUsed=this.json.extensionsUsed||[],this.json.extensionsUsed.find(t=>t===e)||this.json.extensionsUsed.push(e)}registerRequiredExtension(e){this.registerUsedExtension(e),this.json.extensionsRequired=this.json.extensionsRequired||[],this.json.extensionsRequired.find(t=>t===e)||this.json.extensionsRequired.push(e)}removeExtension(e){var t;if((t=this.json.extensions)!=null&&t[e]){this.json.extensionsRemoved=this.json.extensionsRemoved||[];const r=this.json.extensionsRemoved;r.includes(e)||r.push(e)}this.json.extensions&&delete this.json.extensions[e],this.json.extensionsRequired&&this._removeStringFromArray(this.json.extensionsRequired,e),this.json.extensionsUsed&&this._removeStringFromArray(this.json.extensionsUsed,e)}setDefaultScene(e){this.json.scene=e}addScene(e){const{nodeIndices:t}=e;return this.json.scenes=this.json.scenes||[],this.json.scenes.push({nodes:t}),this.json.scenes.length-1}addNode(e){const{meshIndex:t,matrix:r}=e;this.json.nodes=this.json.nodes||[];const i={mesh:t};return r&&(i.matrix=r),this.json.nodes.push(i),this.json.nodes.length-1}addMesh(e){const{attributes:t,indices:r,material:i,mode:s=4}=e,a={primitives:[{attributes:this._addAttributes(t),mode:s}]};if(r){const c=this._addIndices(r);a.primitives[0].indices=c}return Number.isFinite(i)&&(a.primitives[0].material=i),this.json.meshes=this.json.meshes||[],this.json.meshes.push(a),this.json.meshes.length-1}addPointCloud(e){const r={primitives:[{attributes:this._addAttributes(e),mode:0}]};return this.json.meshes=this.json.meshes||[],this.json.meshes.push(r),this.json.meshes.length-1}addImage(e,t){const r=ua(e),i=t||(r==null?void 0:r.mimeType),o={bufferView:this.addBufferView(e),mimeType:i};return this.json.images=this.json.images||[],this.json.images.push(o),this.json.images.length-1}addBufferView(e,t=0,r=this.byteLength){const i=e.byteLength;oe(Number.isFinite(i)),this.sourceBuffers=this.sourceBuffers||[],this.sourceBuffers.push(e);const s={buffer:t,byteOffset:r,byteLength:i};return this.byteLength+=jn(i,4),this.json.bufferViews=this.json.bufferViews||[],this.json.bufferViews.push(s),this.json.bufferViews.length-1}addAccessor(e,t){const r={bufferView:e,type:kh(t.size),componentType:t.componentType,count:t.count,max:t.max,min:t.min};return this.json.accessors=this.json.accessors||[],this.json.accessors.push(r),this.json.accessors.length-1}addBinaryBuffer(e,t={size:3}){const r=this.addBufferView(e);let i={min:t.min,max:t.max};(!i.min||!i.max)&&(i=this._getAccessorMinMax(e,t.size));const s={size:t.size,componentType:zi(e),count:Math.round(e.length/t.size),min:i.min,max:i.max};return this.addAccessor(r,Object.assign(s,t))}addTexture(e){const{imageIndex:t}=e,r={source:t};return this.json.textures=this.json.textures||[],this.json.textures.push(r),this.json.textures.length-1}addMaterial(e){return this.json.materials=this.json.materials||[],this.json.materials.push(e),this.json.materials.length-1}createBinaryChunk(){var s,o;const e=this.byteLength,t=new ArrayBuffer(e),r=new Uint8Array(t);let i=0;for(const a of this.sourceBuffers||[])i=Ym(a,r,i);(o=(s=this.json)==null?void 0:s.buffers)!=null&&o[0]?this.json.buffers[0].byteLength=e:this.json.buffers=[{byteLength:e}],this.gltf.binary=t,this.sourceBuffers=[t],this.gltf.buffers=[{arrayBuffer:t,byteOffset:0,byteLength:t.byteLength}]}_removeStringFromArray(e,t){let r=!0;for(;r;){const i=e.indexOf(t);i>-1?e.splice(i,1):r=!1}}_addAttributes(e={}){const t={};for(const r in e){const i=e[r],s=this._getGltfAttributeName(r),o=this.addBinaryBuffer(i.value,i);t[s]=o}return t}_addIndices(e){return this.addBinaryBuffer(e,{size:1})}_getGltfAttributeName(e){switch(e.toLowerCase()){case"position":case"positions":case"vertices":return"POSITION";case"normal":case"normals":return"NORMAL";case"color":case"colors":return"COLOR_0";case"texcoord":case"texcoords":return"TEXCOORD_0";default:return e}}_getAccessorMinMax(e,t){const r={min:null,max:null};if(e.length<t)return r;r.min=[],r.max=[];const i=e.subarray(0,t);for(const s of i)r.min.push(s),r.max.push(s);for(let s=t;s<e.length;s+=t)for(let o=0;o<t;o++)r.min[0+o]=Math.min(r.min[0+o],e[s+o]),r.max[0+o]=Math.max(r.max[0+o],e[s+o]);return r}}function pu(n){return(n%1+1)%1}const $h={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16,BOOLEAN:1,STRING:1,ENUM:1},aR={INT8:Int8Array,UINT8:Uint8Array,INT16:Int16Array,UINT16:Uint16Array,INT32:Int32Array,UINT32:Uint32Array,INT64:BigInt64Array,UINT64:BigUint64Array,FLOAT32:Float32Array,FLOAT64:Float64Array},Vh={INT8:1,UINT8:1,INT16:2,UINT16:2,INT32:4,UINT32:4,INT64:8,UINT64:8,FLOAT32:4,FLOAT64:8};function Ja(n,e){return Vh[e]*$h[n]}function Wi(n,e,t,r){if(t!=="UINT8"&&t!=="UINT16"&&t!=="UINT32"&&t!=="UINT64")return null;const i=n.getTypedArrayForBufferView(e),s=Hi(i,"SCALAR",t,r+1);return s instanceof BigInt64Array||s instanceof BigUint64Array?null:s}function Hi(n,e,t,r=1){const i=$h[e],s=aR[t],o=Vh[t],a=r*i,c=a*o;let l=n.buffer,u=n.byteOffset;return u%o!==0&&(l=new Uint8Array(l).slice(u,u+c).buffer,u=0),new s(Xn(l),u,a)}function ec(n,e,t){var l,u,d,h,m;const r=`TEXCOORD_${e.texCoord||0}`,i=t.attributes[r],s=n.getTypedArrayForAccessor(i),o=n.gltf.json,a=e.index,c=(u=(l=o.textures)==null?void 0:l[a])==null?void 0:u.source;if(typeof c<"u"){const p=(h=(d=o.images)==null?void 0:d[c])==null?void 0:h.mimeType,g=(m=n.gltf.images)==null?void 0:m[c];if(g&&typeof g.width<"u"){const b=[];for(let _=0;_<s.length;_+=2){const y=cR(g,p,s,_,e.channels);b.push(y)}return b}}return[]}function Gh(n,e,t,r,i){if(!(t!=null&&t.length))return;const s=[];for(const u of t){let d=r.findIndex(h=>h===u);d===-1&&(d=r.push(u)-1),s.push(d)}const o=new Uint32Array(s),a=n.gltf.buffers.push({arrayBuffer:o.buffer,byteOffset:o.byteOffset,byteLength:o.byteLength})-1,c=n.addBufferView(o,a,0),l=n.addAccessor(c,{size:1,componentType:zi(o),count:o.length});i.attributes[e]=l}function cR(n,e,t,r,i=[0]){const s={r:{offset:0,shift:0},g:{offset:1,shift:8},b:{offset:2,shift:16},a:{offset:3,shift:24}},o=t[r],a=t[r+1];let c=1;e&&(e.indexOf("image/jpeg")!==-1||e.indexOf("image/png")!==-1)&&(c=4);const l=lR(o,a,n,c);let u=0;for(const d of i){const h=typeof d=="number"?Object.values(s)[d]:s[d],m=l+h.offset,p=df(n);if(p.data.length<=m)throw new Error(`${p.data.length} <= ${m}`);const g=p.data[m];u|=g<<h.shift}return u}function lR(n,e,t,r=1){const i=t.width,s=pu(n)*(i-1),o=Math.round(s),a=t.height,c=pu(e)*(a-1),l=Math.round(c),u=t.components?t.components:r;return(l*i+o)*u}function zh(n,e,t,r,i){const s=[];for(let o=0;o<e;o++){const a=t[o],c=t[o+1]-t[o];if(c+a>r)break;const l=a/i,u=c/i;s.push(n.slice(l,l+u))}return s}function Wh(n,e,t){const r=[];for(let i=0;i<e;i++){const s=i*t;r.push(n.slice(s,s+t))}return r}function Hh(n,e,t,r){if(t)throw new Error("Not implemented - arrayOffsets for strings is specified");if(r){const i=[],s=new TextDecoder("utf8");let o=0;for(let a=0;a<n;a++){const c=r[a+1]-r[a];if(c+o<=e.length){const l=e.subarray(o,c+o),u=s.decode(l);i.push(u),o+=c}}return i}return[]}const Ut="EXT_mesh_features",uR=Ut;async function fR(n,e){const t=new Q(n);hR(t,e)}function dR(n,e){const t=new Q(n);return pR(t),t.createBinaryChunk(),t.gltf}function hR(n,e){const t=n.gltf.json;if(t.meshes)for(const r of t.meshes)for(const i of r.primitives)mR(n,i,e)}function mR(n,e,t){var s,o,a;if(!((s=t==null?void 0:t.gltf)!=null&&s.loadBuffers))return;const r=(o=e.extensions)==null?void 0:o[Ut],i=r==null?void 0:r.featureIds;if(i)for(const c of i){let l;if(typeof c.attribute<"u"){const u=`_FEATURE_ID_${c.attribute}`,d=e.attributes[u];l=n.getTypedArrayForAccessor(d)}else typeof c.texture<"u"&&((a=t==null?void 0:t.gltf)!=null&&a.loadImages)?l=ec(n,c.texture,e):l=[];c.data=l}}function pR(n,e){const t=n.gltf.json.meshes;if(t)for(const r of t)for(const i of r.primitives)bR(n,i)}function gR(n,e,t,r){e.extensions||(e.extensions={});let i=e.extensions[Ut];i||(i={featureIds:[]},e.extensions[Ut]=i);const{featureIds:s}=i,o={featureCount:t.length,propertyTable:r,data:t};s.push(o),n.addObjectExtension(e,Ut,i)}function bR(n,e){var i;const t=(i=e.extensions)==null?void 0:i[Ut];if(!t)return;const r=t.featureIds;r.forEach((s,o)=>{if(s.data){const{accessorKey:a,index:c}=_R(e.attributes),l=new Uint32Array(s.data);r[o]={featureCount:l.length,propertyTable:s.propertyTable,attribute:c},n.gltf.buffers.push({arrayBuffer:l.buffer,byteOffset:l.byteOffset,byteLength:l.byteLength});const u=n.addBufferView(l),d=n.addAccessor(u,{size:1,componentType:zi(l),count:l.length});e.attributes[a]=d}})}function _R(n){const e="_FEATURE_ID_",t=Object.keys(n).filter(s=>s.indexOf(e)===0);let r=-1;for(const s of t){const o=Number(s.substring(e.length));o>r&&(r=o)}return r++,{accessorKey:`${e}${r}`,index:r}}const yR=Object.freeze(Object.defineProperty({__proto__:null,createExtMeshFeatures:gR,decode:fR,encode:dR,name:uR},Symbol.toStringTag,{value:"Module"})),Xt="EXT_structural_metadata",vR=Xt;async function xR(n,e){const t=new Q(n);wR(t,e)}function SR(n,e){const t=new Q(n);return kR(t),t.createBinaryChunk(),t.gltf}function wR(n,e){var r,i;if(!((r=e.gltf)!=null&&r.loadBuffers))return;const t=n.getExtension(Xt);t&&((i=e.gltf)!=null&&i.loadImages&&TR(n,t),ER(n,t))}function TR(n,e){const t=e.propertyTextures,r=n.gltf.json;if(t&&r.meshes)for(const i of r.meshes)for(const s of i.primitives)RR(n,t,s,e)}function ER(n,e){const t=e.schema;if(!t)return;const r=t.classes,i=e.propertyTables;if(r&&i)for(const s in r){const o=AR(i,s);o&&MR(n,t,o)}}function AR(n,e){for(const t of n)if(t.class===e)return t;return null}function RR(n,e,t,r){var o;if(!e)return;const i=(o=t.extensions)==null?void 0:o[Xt],s=i==null?void 0:i.propertyTextures;if(s)for(const a of s){const c=e[a];IR(n,c,t,r)}}function IR(n,e,t,r){var s;if(!e.properties)return;r.dataAttributeNames||(r.dataAttributeNames=[]);const i=e.class;for(const o in e.properties){const a=`${i}_${o}`,c=(s=e.properties)==null?void 0:s[o];if(!c)continue;c.data||(c.data=[]);const l=c.data,u=ec(n,c,t);u!==null&&(Gh(n,a,u,l,t),c.data=l,r.dataAttributeNames.push(a))}}function MR(n,e,t){var s,o;const r=(s=e.classes)==null?void 0:s[t.class];if(!r)throw new Error(`Incorrect data in the EXT_structural_metadata extension: no schema class with name ${t.class}`);const i=t.count;for(const a in r.properties){const c=r.properties[a],l=(o=t.properties)==null?void 0:o[a];if(l){const u=LR(n,e,c,i,l);l.data=u}}}function LR(n,e,t,r,i){let s=[];const o=i.values,a=n.getTypedArrayForBufferView(o),c=CR(n,t,i,r),l=PR(n,i,r);switch(t.type){case"SCALAR":case"VEC2":case"VEC3":case"VEC4":case"MAT2":case"MAT3":case"MAT4":{s=BR(t,r,a,c);break}case"BOOLEAN":throw new Error(`Not implemented - classProperty.type=${t.type}`);case"STRING":{s=Hh(r,a,c,l);break}case"ENUM":{s=NR(e,t,r,a,c);break}default:throw new Error(`Unknown classProperty type ${t.type}`)}return s}function CR(n,e,t,r){return e.array&&typeof e.count>"u"&&typeof t.arrayOffsets<"u"?Wi(n,t.arrayOffsets,t.arrayOffsetType||"UINT32",r):null}function PR(n,e,t){return typeof e.stringOffsets<"u"?Wi(n,e.stringOffsets,e.stringOffsetType||"UINT32",t):null}function BR(n,e,t,r){const i=n.array,s=n.count,o=Ja(n.type,n.componentType),a=t.byteLength/o;let c;return n.componentType?c=Hi(t,n.type,n.componentType,a):c=t,i?r?zh(c,e,r,t.length,o):s?Wh(c,e,s):[]:c}function NR(n,e,t,r,i){var d;const s=e.enumType;if(!s)throw new Error("Incorrect data in the EXT_structural_metadata extension: classProperty.enumType is not set for type ENUM");const o=(d=n.enums)==null?void 0:d[s];if(!o)throw new Error(`Incorrect data in the EXT_structural_metadata extension: schema.enums does't contain ${s}`);const a=o.valueType||"UINT16",c=Ja(e.type,a),l=r.byteLength/c;let u=Hi(r,e.type,a,l);if(u||(u=r),e.array){if(i)return OR({valuesData:u,numberOfElements:t,arrayOffsets:i,valuesDataBytesLength:r.length,elementSize:c,enumEntry:o});const h=e.count;return h?FR(u,t,h,o):[]}return tc(u,0,t,o)}function OR(n){const{valuesData:e,numberOfElements:t,arrayOffsets:r,valuesDataBytesLength:i,elementSize:s,enumEntry:o}=n,a=[];for(let c=0;c<t;c++){const l=r[c],u=r[c+1]-r[c];if(u+l>i)break;const d=l/s,h=u/s,m=tc(e,d,h,o);a.push(m)}return a}function FR(n,e,t,r){const i=[];for(let s=0;s<e;s++){const o=t*s,a=tc(n,o,t,r);i.push(a)}return i}function tc(n,e,t,r){const i=[];for(let s=0;s<t;s++)if(n instanceof BigInt64Array||n instanceof BigUint64Array)i.push("");else{const o=n[e+s],a=UR(r,o);a?i.push(a.name):i.push("")}return i}function UR(n,e){for(const t of n.values)if(t.value===e)return t;return null}const DR="schemaClassId";function kR(n,e){var r,i;const t=n.getExtension(Xt);if(t&&t.propertyTables)for(const s of t.propertyTables){const o=s.class,a=(i=(r=t.schema)==null?void 0:r.classes)==null?void 0:i[o];s.properties&&a&&$R(s,a,n)}}function $R(n,e,t){for(const r in n.properties){const i=n.properties[r].data;if(i){const s=e.properties[r];if(s){const o=WR(i,s,t);n.properties[r]=o}}}}function VR(n,e,t=DR){let r=n.getExtension(Xt);r||(r=n.addExtension(Xt)),r.schema=GR(e,t,r.schema);const i=zR(e,t,r.schema);return r.propertyTables||(r.propertyTables=[]),r.propertyTables.push(i)-1}function GR(n,e,t){const r=t??{id:"schema_id"},i={properties:{}};for(const s of n){const o={type:s.elementType,componentType:s.componentType};i.properties[s.name]=o}return r.classes={},r.classes[e]=i,r}function zR(n,e,t){var o;const r={class:e,count:0};let i=0;const s=(o=t.classes)==null?void 0:o[e];for(const a of n){if(i===0&&(i=a.values.length),i!==a.values.length&&a.values.length)throw new Error("Illegal values in attributes");(s==null?void 0:s.properties[a.name])&&(r.properties||(r.properties={}),r.properties[a.name]={values:0,data:a.values})}return r.count=i,r}function WR(n,e,t){const r={values:0};if(e.type==="STRING"){const{stringData:i,stringOffsets:s}=XR(n);r.stringOffsets=Ks(s,t),r.values=Ks(i,t)}else if(e.type==="SCALAR"&&e.componentType){const i=jR(n,e.componentType);r.values=Ks(i,t)}return r}const HR={INT8:Int8Array,UINT8:Uint8Array,INT16:Int16Array,UINT16:Uint16Array,INT32:Int32Array,UINT32:Uint32Array,INT64:Int32Array,UINT64:Uint32Array,FLOAT32:Float32Array,FLOAT64:Float64Array};function jR(n,e){const t=[];for(const i of n)t.push(Number(i));const r=HR[e];if(!r)throw new Error("Illegal component type");return new r(t)}function XR(n){const e=new TextEncoder,t=[];let r=0;for(const c of n){const l=e.encode(c);r+=l.length,t.push(l)}const i=new Uint8Array(r),s=[];let o=0;for(const c of t)i.set(c,o),s.push(o),o+=c.length;s.push(o);const a=new Uint32Array(s);return{stringData:i,stringOffsets:a}}function Ks(n,e){return e.gltf.buffers.push({arrayBuffer:Xn(n.buffer),byteOffset:n.byteOffset,byteLength:n.byteLength}),e.addBufferView(n)}const KR=Object.freeze(Object.defineProperty({__proto__:null,createExtStructuralMetadata:VR,decode:xR,encode:SR,name:vR},Symbol.toStringTag,{value:"Module"})),jh="EXT_feature_metadata",qR=jh;async function YR(n,e){const t=new Q(n);QR(t,e)}function QR(n,e){var r,i;if(!((r=e.gltf)!=null&&r.loadBuffers))return;const t=n.getExtension(jh);t&&((i=e.gltf)!=null&&i.loadImages&&ZR(n,t),JR(n,t))}function ZR(n,e){const t=e.schema;if(!t)return;const r=t.classes,{featureTextures:i}=e;if(r&&i)for(const s in r){const o=r[s],a=tI(i,s);a&&rI(n,a,o)}}function JR(n,e){const t=e.schema;if(!t)return;const r=t.classes,i=e.featureTables;if(r&&i)for(const s in r){const o=eI(i,s);o&&nI(n,t,o)}}function eI(n,e){for(const t in n){const r=n[t];if(r.class===e)return r}return null}function tI(n,e){for(const t in n){const r=n[t];if(r.class===e)return r}return null}function nI(n,e,t){var s,o;if(!t.class)return;const r=(s=e.classes)==null?void 0:s[t.class];if(!r)throw new Error(`Incorrect data in the EXT_structural_metadata extension: no schema class with name ${t.class}`);const i=t.count;for(const a in r.properties){const c=r.properties[a],l=(o=t.properties)==null?void 0:o[a];if(l){const u=iI(n,e,c,i,l);l.data=u}}}function rI(n,e,t){var i;const r=e.class;for(const s in t.properties){const o=(i=e==null?void 0:e.properties)==null?void 0:i[s];if(o){const a=lI(n,o,r);o.data=a}}}function iI(n,e,t,r,i){let s=[];const o=i.bufferView,a=n.getTypedArrayForBufferView(o),c=sI(n,t,i,r),l=oI(n,t,i,r);return t.type==="STRING"||t.componentType==="STRING"?s=Hh(r,a,c,l):aI(t)&&(s=cI(t,r,a,c)),s}function sI(n,e,t,r){return e.type==="ARRAY"&&typeof e.componentCount>"u"&&typeof t.arrayOffsetBufferView<"u"?Wi(n,t.arrayOffsetBufferView,t.offsetType||"UINT32",r):null}function oI(n,e,t,r){return typeof t.stringOffsetBufferView<"u"?Wi(n,t.stringOffsetBufferView,t.offsetType||"UINT32",r):null}function aI(n){const e=["UINT8","INT16","UINT16","INT32","UINT32","INT64","UINT64","FLOAT32","FLOAT64"];return e.includes(n.type)||typeof n.componentType<"u"&&e.includes(n.componentType)}function cI(n,e,t,r){const i=n.type==="ARRAY",s=n.componentCount,o="SCALAR",a=n.componentType||n.type,c=Ja(o,a),l=t.byteLength/c,u=Hi(t,o,a,l);return i?r?zh(u,e,r,t.length,c):s?Wh(u,e,s):[]:u}function lI(n,e,t){const r=n.gltf.json;if(!r.meshes)return[];const i=[];for(const s of r.meshes)for(const o of s.primitives)uI(n,t,e,i,o);return i}function uI(n,e,t,r,i){const s={channels:t.channels,...t.texture},o=ec(n,s,i);o&&Gh(n,e,o,r,i)}const fI=Object.freeze(Object.defineProperty({__proto__:null,decode:YR,name:qR},Symbol.toStringTag,{value:"Module"})),dI="4.5.2",hI="4.5.2",ui={TRANSCODER:"basis_transcoder.js",TRANSCODER_WASM:"basis_transcoder.wasm",ENCODER:"basis_encoder.js",ENCODER_WASM:"basis_encoder.wasm"};let gu;async function bu(n){Tm(n.modules);const e=Em("basis");return e||(gu||(gu=mI(n)),await gu)}async function mI(n){let e=null,t=null;return[e,t]=await Promise.all([await Ve(ui.TRANSCODER,"textures",n),await Ve(ui.TRANSCODER_WASM,"textures",n)]),e=e||globalThis.BASIS,await pI(e,t)}function pI(n,e){const t={};return e&&(t.wasmBinary=e),new Promise(r=>{n(t).then(i=>{const{BasisFile:s,initializeBasis:o}=i;o(),r({BasisFile:s})})})}let qs;async function _u(n){const e=n.modules||{};return e.basisEncoder?e.basisEncoder:(qs=qs||gI(n),await qs)}async function gI(n){let e=null,t=null;return[e,t]=await Promise.all([await Ve(ui.ENCODER,"textures",n),await Ve(ui.ENCODER_WASM,"textures",n)]),e=e||globalThis.BASIS,await bI(e,t)}function bI(n,e){const t={};return e&&(t.wasmBinary=e),new Promise(r=>{n(t).then(i=>{const{BasisFile:s,KTX2File:o,initializeBasis:a,BasisEncoder:c}=i;a(),r({BasisFile:s,KTX2File:o,BasisEncoder:c})})})}const _I=32854,yI=32856,yu=36194,vI=33776,xI=33779,SI=37493,wI=35840,TI=35842,EI=36196,AI=35986,RI=34798,II=37808,MI=36283,LI=36285,vu=36492,CI=["","WEBKIT_","MOZ_"],xu={WEBGL_compressed_texture_s3tc:["bc1-rgb-unorm-webgl","bc1-rgba-unorm","bc2-rgba-unorm","bc3-rgba-unorm"],WEBGL_compressed_texture_s3tc_srgb:["bc1-rgb-unorm-srgb-webgl","bc1-rgba-unorm-srgb","bc2-rgba-unorm-srgb","bc3-rgba-unorm-srgb"],EXT_texture_compression_rgtc:["bc4-r-unorm","bc4-r-snorm","bc5-rg-unorm","bc5-rg-snorm"],EXT_texture_compression_bptc:["bc6h-rgb-ufloat","bc6h-rgb-float","bc7-rgba-unorm","bc7-rgba-unorm-srgb"],WEBGL_compressed_texture_etc1:["etc1-rgb-unorm-webgl"],WEBGL_compressed_texture_etc:["etc2-rgb8unorm","etc2-rgb8unorm-srgb","etc2-rgb8a1unorm","etc2-rgb8a1unorm-srgb","etc2-rgba8unorm","etc2-rgba8unorm-srgb","eac-r11unorm","eac-r11snorm","eac-rg11unorm","eac-rg11snorm"],WEBGL_compressed_texture_pvrtc:["pvrtc-rgb4unorm-webgl","pvrtc-rgba4unorm-webgl","pvrtc-rgb2unorm-webgl","pvrtc-rgba2unorm-webgl"],WEBGL_compressed_texture_atc:["atc-rgb-unorm-webgl","atc-rgba-unorm-webgl","atc-rgbai-unorm-webgl"],WEBGL_compressed_texture_astc:["astc-4x4-unorm","astc-4x4-unorm-srgb","astc-5x4-unorm","astc-5x4-unorm-srgb","astc-5x5-unorm","astc-5x5-unorm-srgb","astc-6x5-unorm","astc-6x5-unorm-srgb","astc-6x6-unorm","astc-6x6-unorm-srgb","astc-8x5-unorm","astc-8x5-unorm-srgb","astc-8x6-unorm","astc-8x6-unorm-srgb","astc-8x8-unorm","astc-8x8-unorm-srgb","astc-10x5-unorm","astc-10x5-unorm-srgb","astc-10x6-unorm","astc-10x6-unorm-srgb","astc-10x8-unorm","astc-10x8-unorm-srgb","astc-10x10-unorm","astc-10x10-unorm-srgb","astc-12x10-unorm","astc-12x10-unorm-srgb","astc-12x12-unorm","astc-12x12-unorm-srgb"]};let Br=null;function PI(n){if(!Br){n=n||BI()||void 0,Br=new Set;for(const e of CI)for(const t in xu)if(n&&n.getExtension(`${e}${t}`))for(const r of xu[t])Br.add(r)}return Br}function BI(){try{return document.createElement("canvas").getContext("webgl")}catch{return null}}const me=[171,75,84,88,32,50,48,187,13,10,26,10];function NI(n){const e=new Uint8Array(n);return!(e.byteLength<me.length||e[0]!==me[0]||e[1]!==me[1]||e[2]!==me[2]||e[3]!==me[3]||e[4]!==me[4]||e[5]!==me[5]||e[6]!==me[6]||e[7]!==me[7]||e[8]!==me[8]||e[9]!==me[9]||e[10]!==me[10]||e[11]!==me[11])}let Su=Promise.resolve();const Xh={etc1:{basisFormat:0,compressed:!0,format:EI,textureFormat:"etc1-rgb-unorm-webgl"},etc2:{basisFormat:1,compressed:!0,format:SI,textureFormat:"etc2-rgba8unorm"},bc1:{basisFormat:2,compressed:!0,format:vI,textureFormat:"bc1-rgb-unorm-webgl"},bc3:{basisFormat:3,compressed:!0,format:xI,textureFormat:"bc3-rgba-unorm"},bc4:{basisFormat:4,compressed:!0,format:MI,textureFormat:"bc4-r-unorm"},bc5:{basisFormat:5,compressed:!0,format:LI,textureFormat:"bc5-rg-unorm"},"bc7-m6-opaque-only":{basisFormat:6,compressed:!0,format:vu,textureFormat:"bc7-rgba-unorm"},"bc7-m5":{basisFormat:7,compressed:!0,format:vu,textureFormat:"bc7-rgba-unorm"},"pvrtc1-4-rgb":{basisFormat:8,compressed:!0,format:wI,textureFormat:"pvrtc-rgb4unorm-webgl"},"pvrtc1-4-rgba":{basisFormat:9,compressed:!0,format:TI,textureFormat:"pvrtc-rgba4unorm-webgl"},"astc-4x4":{basisFormat:10,compressed:!0,format:II,textureFormat:"astc-4x4-unorm"},"atc-rgb":{basisFormat:11,compressed:!0,format:AI,textureFormat:"atc-rgb-unorm-webgl"},"atc-rgba-interpolated-alpha":{basisFormat:12,compressed:!0,format:RI,textureFormat:"atc-rgbai-unorm-webgl"},rgba32:{basisFormat:13,compressed:!1,format:yI,textureFormat:"rgba8unorm"},rgb565:{basisFormat:14,compressed:!1,format:yu,textureFormat:"rgb565unorm-webgl"},bgr565:{basisFormat:15,compressed:!1,format:yu,textureFormat:"rgb565unorm-webgl"},rgba4444:{basisFormat:16,compressed:!1,format:_I,textureFormat:"rgba4unorm-webgl"}};Object.freeze(Object.keys(Xh));async function OI(n){const e=Su;let t;Su=new Promise(r=>{t=r}),await e;try{return await n()}finally{t()}}async function FI(n,e={}){const t=Ku(e);return await OI(async()=>{var r;if(!((r=e.basis)!=null&&r.containerFormat)||e.basis.containerFormat==="auto"){if(NI(n)){const s=await _u(t);return wu(s.KTX2File,n,e)}const{BasisFile:i}=await bu(t);return Ys(i,n,e)}switch(e.basis.module){case"encoder":const i=await _u(t);switch(e.basis.containerFormat){case"ktx2":return wu(i.KTX2File,n,e);case"basis":default:return Ys(i.BasisFile,n,e)}case"transcoder":default:const{BasisFile:s}=await bu(t);return Ys(s,n,e)}})}function Ys(n,e,t){const r=new n(new Uint8Array(e));try{if(!r.startTranscoding())throw new Error("Failed to start basis transcoding");const i=r.getNumImages(),s=[];for(let o=0;o<i;o++){const a=r.getNumLevels(o),c=[];for(let l=0;l<a;l++)c.push(UI(r,o,l,t));s.push(c)}return s}finally{r.close(),r.delete()}}function UI(n,e,t,r){const i=n.getImageWidth(e,t),s=n.getImageHeight(e,t),o=n.getHasAlpha(),{compressed:a,format:c,basisFormat:l,textureFormat:u}=Kh(r,o),d=n.getImageTranscodedSizeInBytes(e,t,l),h=new Uint8Array(d);if(!n.transcodeImage(h,e,t,l,0,0))throw new Error("failed to start Basis transcoding");return{shape:"texture-level",width:i,height:s,data:h,compressed:a,...c!==void 0?{format:c}:{},...u!==void 0?{textureFormat:u}:{},hasAlpha:o}}function wu(n,e,t){const r=new n(new Uint8Array(e));try{if(!r.startTranscoding())throw new Error("failed to start KTX2 transcoding");const i=r.getLevels(),s=[];for(let o=0;o<i;o++)s.push(DI(r,o,t));return[s]}finally{r.close(),r.delete()}}function DI(n,e,t){const{alphaFlag:r,height:i,width:s}=n.getImageLevelInfo(e,0,0),{compressed:o,format:a,basisFormat:c,textureFormat:l}=Kh(t,r),u=n.getImageTranscodedSizeInBytes(e,0,0,c),d=new Uint8Array(u);if(!n.transcodeImage(d,e,0,0,c,0,-1,-1))throw new Error("Failed to transcode KTX2 image");return{shape:"texture-level",width:s,height:i,data:d,compressed:o,...a!==void 0?{format:a}:{},...l!==void 0?{textureFormat:l}:{},levelSize:u,hasAlpha:r}}function Kh(n,e){var s,o;let t=((s=n.basis)==null?void 0:s.format)||"auto";t==="auto"&&(t=(o=n.basis)!=null&&o.supportedTextureFormats?Jo(n.basis.supportedTextureFormats):Jo()),typeof t=="object"&&(t=e?t.alpha:t.noAlpha);const r=t.toLowerCase(),i=Xh[r];if(!i)throw new Error(`Unknown Basis format ${t}`);return i}function Jo(n=PI()){const e=new Set(n);return At(e,["astc-4x4-unorm","astc-4x4-unorm-srgb"])?"astc-4x4":At(e,["bc7-rgba-unorm","bc7-rgba-unorm-srgb"])?{alpha:"bc7-m5",noAlpha:"bc7-m6-opaque-only"}:At(e,["bc1-rgb-unorm-webgl","bc1-rgb-unorm-srgb-webgl","bc1-rgba-unorm","bc1-rgba-unorm-srgb","bc2-rgba-unorm","bc2-rgba-unorm-srgb","bc3-rgba-unorm","bc3-rgba-unorm-srgb"])?{alpha:"bc3",noAlpha:"bc1"}:At(e,["pvrtc-rgb4unorm-webgl","pvrtc-rgba4unorm-webgl","pvrtc-rgb2unorm-webgl","pvrtc-rgba2unorm-webgl"])?{alpha:"pvrtc1-4-rgba",noAlpha:"pvrtc1-4-rgb"}:At(e,["etc2-rgb8unorm","etc2-rgb8unorm-srgb","etc2-rgb8a1unorm","etc2-rgb8a1unorm-srgb","etc2-rgba8unorm","etc2-rgba8unorm-srgb","eac-r11unorm","eac-r11snorm","eac-rg11unorm","eac-rg11snorm"])?"etc2":e.has("etc1-rgb-unorm-webgl")?"etc1":At(e,["atc-rgb-unorm-webgl","atc-rgba-unorm-webgl","atc-rgbai-unorm-webgl"])?{alpha:"atc-rgba-interpolated-alpha",noAlpha:"atc-rgb"}:"rgb565"}function At(n,e){return e.some(t=>n.has(t))}const kI={dataType:null,batchType:null,name:"Basis",id:"basis",module:"textures",version:hI,worker:!0,extensions:["basis","ktx2"],mimeTypes:["application/octet-stream","image/ktx2"],tests:["sB"],binary:!0,options:{basis:{format:"auto",containerFormat:"auto",module:"transcoder"}}},$I={...kI,parse:FI},Kt=!0,Tu=1735152710,nc=12,fi=8,VI=1313821514,GI=5130562,zI=0,WI=0,HI=1;function jI(n,e=0){return`${String.fromCharCode(n.getUint8(e+0))}${String.fromCharCode(n.getUint8(e+1))}${String.fromCharCode(n.getUint8(e+2))}${String.fromCharCode(n.getUint8(e+3))}`}function XI(n,e=0,t={}){const r=new DataView(n),{magic:i=Tu}=t,s=r.getUint32(e,!1);return s===i||s===Tu}function KI(n,e,t=0,r={}){const i=new DataView(e),s=jI(i,t+0),o=i.getUint32(t+4,Kt),a=i.getUint32(t+8,Kt);switch(Object.assign(n,{header:{byteOffset:t,byteLength:a,hasBinChunk:!1},type:s,version:o,json:{},binChunks:[]}),t+=nc,n.version){case 1:return qI(n,i,t);case 2:return YI(n,i,t,r={});default:throw new Error(`Invalid GLB version ${n.version}. Only supports version 1 and 2.`)}}function qI(n,e,t){ze(n.header.byteLength>nc+fi);const r=e.getUint32(t+0,Kt),i=e.getUint32(t+4,Kt);return t+=fi,ze(i===zI),ea(n,e,t,r),t+=r,t+=ta(n,e,t,n.header.byteLength),t}function YI(n,e,t,r){return ze(n.header.byteLength>nc+fi),QI(n,e,t,r),t+n.header.byteLength}function QI(n,e,t,r){for(;t+8<=n.header.byteLength;){const i=e.getUint32(t+0,Kt),s=e.getUint32(t+4,Kt);switch(t+=fi,s){case VI:ea(n,e,t,i);break;case GI:ta(n,e,t,i);break;case WI:r.strict||ea(n,e,t,i);break;case HI:r.strict||ta(n,e,t,i);break}t+=jn(i,4)}return t}function ea(n,e,t,r){const i=new Uint8Array(e.buffer,t,r),o=new TextDecoder("utf8").decode(i);return n.json=JSON.parse(o),jn(r,4)}function ta(n,e,t,r){return n.header.hasBinChunk=!0,n.binChunks.push({byteOffset:t,byteLength:r,arrayBuffer:e.buffer}),jn(r,4)}function qh(n,e,t){var s;if(n.startsWith("data:")||n.startsWith("http:")||n.startsWith("https:"))return n;const i=(t==null?void 0:t.baseUrl)||ZI((s=e==null?void 0:e.core)==null?void 0:s.baseUrl);if(!i)throw new Error(`'baseUrl' must be provided to resolve relative url ${n}`);return i.endsWith("/")?`${i}${n}`:`${i}/${n}`}function ZI(n){if(!n)return;if(n.endsWith("/"))return n;const e=n.lastIndexOf("/");return e>=0?n.slice(0,e+1):""}function JI(n){return typeof n=="string"?n:["NONE","OCTAHEDRAL","QUATERNION","EXPONENTIAL","COLOR"][n]}async function eM(n,e,t,r,i,s="NONE"){await ac.ready,ac.decodeGltfBuffer(n,e,t,r,i,JI(s))}async function Yh(n,e,t){var o;if(!((o=e.gltf)!=null&&o.decompressMeshes)||!e.gltf.loadBuffers)return;tM(n.json);const r=new Q(n),i=n.json.bufferViews||[],s=i.map(a=>nM(r,a,t));await Promise.all(s);for(const a of i)r.removeObjectExtension(a,t);for(const a of n.json.buffers||[])r.removeObjectExtension(a,t);r.removeExtension(t)}function tM(n){const e=n.bufferViews||[];for(let r=0;r<e.length;r++){const i=e[r].extensions;if(i!=null&&i.KHR_meshopt_compression&&i.EXT_meshopt_compression)throw new Error(`glTF bufferView ${r} cannot use both KHR_meshopt_compression and EXT_meshopt_compression.`)}const t=n.buffers||[];for(let r=0;r<t.length;r++){const i=t[r].extensions;if(i!=null&&i.KHR_meshopt_compression&&i.EXT_meshopt_compression)throw new Error(`glTF buffer ${r} cannot use both KHR_meshopt_compression and EXT_meshopt_compression.`)}}async function nM(n,e,t){const r=n.getObjectExtension(e,t);if(!r)return;const{byteOffset:i=0,byteLength:s,byteStride:o,count:a,mode:c,filter:l="NONE",buffer:u}=r,d=n.gltf.buffers[u],h=n.gltf.buffers[e.buffer],m=new Uint8Array(d.arrayBuffer,d.byteOffset+i,s),p=new Uint8Array(h.arrayBuffer,h.byteOffset+(e.byteOffset||0),e.byteLength);await eM(p,a,o,m,c,l)}const Qh="EXT_meshopt_compression";async function rM(n,e){await Yh(n,e,Qh)}const iM=Object.freeze(Object.defineProperty({__proto__:null,decode:rM,name:Qh},Symbol.toStringTag,{value:"Module"})),Zh="KHR_meshopt_compression";async function sM(n,e){await Yh(n,e,Zh)}const oM=Object.freeze(Object.defineProperty({__proto__:null,decode:sM,name:Zh},Symbol.toStringTag,{value:"Module"})),Rt="EXT_texture_webp",aM=Rt;function cM(n,e){const t=new Q(n);if(!Ug("image/webp")){if(t.getRequiredExtensions().includes(Rt))throw new Error(`gltf: Required extension ${Rt} not supported by browser`);return}const{json:r}=t;for(const i of r.textures||[]){const s=t.getObjectExtension(i,Rt);s&&(i.source=s.source),t.removeObjectExtension(i,Rt)}t.removeExtension(Rt)}const lM=Object.freeze(Object.defineProperty({__proto__:null,name:aM,preprocess:cM},Symbol.toStringTag,{value:"Module"})),It="EXT_texture_avif",uM=It;async function fM(n,e){const t=new Q(n);if(!(await Og()).has("image/avif")){if(t.getRequiredExtensions().includes(It))throw new Error(`gltf: Required extension ${It} not supported by browser`);return}const{json:i}=t;for(const s of i.textures||[]){const o=t.getObjectExtension(s,It);o&&(s.source=o.source),t.removeObjectExtension(s,It)}t.removeExtension(It)}const dM=Object.freeze(Object.defineProperty({__proto__:null,name:uM,preprocess:fM},Symbol.toStringTag,{value:"Module"})),Vr="KHR_texture_basisu",hM=Vr;function mM(n,e){const t=new Q(n),{json:r}=t;for(const i of r.textures||[]){const s=t.getObjectExtension(i,Vr);s&&(i.source=s.source,t.removeObjectExtension(i,Vr))}t.removeExtension(Vr)}const pM=Object.freeze(Object.defineProperty({__proto__:null,name:hM,preprocess:mM},Symbol.toStringTag,{value:"Module"})),gM="1.5.6",bM="1.4.1",Qs=`https://www.gstatic.com/draco/versioned/decoders/${gM}`,ee={DECODER:"draco_wasm_wrapper.js",DECODER_WASM:"draco_decoder.wasm",FALLBACK_DECODER:"draco_decoder.js",ENCODER:"draco_encoder.js"},dn={[ee.DECODER]:`${Qs}/${ee.DECODER}`,[ee.DECODER_WASM]:`${Qs}/${ee.DECODER_WASM}`,[ee.FALLBACK_DECODER]:`${Qs}/${ee.FALLBACK_DECODER}`,[ee.ENCODER]:`https://raw.githubusercontent.com/google/draco/${bM}/javascript/${ee.ENCODER}`};let Zs;async function _M(n={},e){const t=n.modules||{};return t.draco3d?Zs||(Zs=t.draco3d.createDecoderModule({}).then(r=>({draco:r}))):Zs||(Zs=yM(n,e)),await Zs}function Eu(n,e){if(n&&typeof n=="object"){if(n.default)return n.default;if(n[e])return n[e]}return n}async function yM(n,e){let t,r;switch(e){case"js":t=await Ve(dn[ee.FALLBACK_DECODER],"draco",n,ee.FALLBACK_DECODER);break;case"wasm":default:try{[t,r]=await Promise.all([await Ve(dn[ee.DECODER],"draco",n,ee.DECODER),await Ve(dn[ee.DECODER_WASM],"draco",n,ee.DECODER_WASM)])}catch{t=null,r=null}}return t=Eu(t,"DracoDecoderModule"),t=t||globalThis.DracoDecoderModule,!t&&!pe&&([t,r]=await Promise.all([await Ve(dn[ee.DECODER],"draco",{...n,useLocalLibraries:!0},ee.DECODER),await Ve(dn[ee.DECODER_WASM],"draco",{...n,useLocalLibraries:!0},ee.DECODER_WASM)]),t=Eu(t,"DracoDecoderModule"),t=t||globalThis.DracoDecoderModule),await vM(t,r)}function vM(n,e){if(typeof n!="function")throw new Error("DracoDecoderModule could not be loaded");const t={};return e&&(t.wasmBinary=e),new Promise(r=>{n({...t,onModuleLoaded:i=>r({draco:i})})})}const xM="4.5.2";function SM(n,e,t){const r=Jh(e.metadata),i=[],s=wM(e.attributes);for(const o in n){const a=n[o],c=Au(o,a,s[o]);i.push(c)}if(t){const o=Au("indices",t);i.push(o)}return{fields:i,metadata:r}}function wM(n){const e={};for(const t in n){const r=n[t];e[r.name||"undefined"]=r}return e}function Au(n,e,t){const r=t?Jh(t.metadata):void 0;return eg(n,e,r)}function Jh(n){Object.entries(n);const e={};for(const t in n)e[`${t}.string`]=JSON.stringify(n[t]);return e}const Ru={POSITION:"POSITION",NORMAL:"NORMAL",COLOR:"COLOR_0",TEX_COORD:"TEXCOORD_0"},TM={1:Int8Array,2:Uint8Array,3:Int16Array,4:Uint16Array,5:Int32Array,6:Uint32Array,9:Float32Array},EM=4;class AM{constructor(e){f(this,"draco");f(this,"decoder");f(this,"metadataQuerier");this.draco=e,this.decoder=new this.draco.Decoder,this.metadataQuerier=new this.draco.MetadataQuerier}destroy(){this.draco.destroy(this.decoder),this.draco.destroy(this.metadataQuerier)}parseSync(e,t={}){const r=new this.draco.DecoderBuffer;r.Init(new Int8Array(e),e.byteLength),this._disableAttributeTransforms(t);const i=this.decoder.GetEncodedGeometryType(r),s=i===this.draco.TRIANGULAR_MESH?new this.draco.Mesh:new this.draco.PointCloud;try{let o;switch(i){case this.draco.TRIANGULAR_MESH:o=this.decoder.DecodeBufferToMesh(r,s);break;case this.draco.POINT_CLOUD:o=this.decoder.DecodeBufferToPointCloud(r,s);break;default:throw new Error("DRACO: Unknown geometry type.")}if(!o.ok()||!s.ptr){const h=`DRACO decompression failed: ${o.error_msg()}`;throw new Error(h)}const a=this._getDracoLoaderData(s,i,t),c=this._getMeshData(s,a,t),l=Jp(c.attributes),u=SM(c.attributes,a,c.indices);return{loader:"draco",loaderData:a,header:{vertexCount:s.num_points(),boundingBox:l},...c,schema:u}}finally{this.draco.destroy(r),s&&this.draco.destroy(s)}}_getDracoLoaderData(e,t,r){const i=this._getTopLevelMetadata(e),s=this._getDracoAttributes(e,r);return{geometry_type:t,num_attributes:e.num_attributes(),num_points:e.num_points(),num_faces:e instanceof this.draco.Mesh?e.num_faces():0,metadata:i,attributes:s}}_getDracoAttributes(e,t){const r={};for(let i=0;i<e.num_attributes();i++){const s=this.decoder.GetAttribute(e,i),o=this._getAttributeMetadata(e,i);r[s.unique_id()]={unique_id:s.unique_id(),attribute_type:s.attribute_type(),data_type:s.data_type(),num_components:s.num_components(),byte_offset:s.byte_offset(),byte_stride:s.byte_stride(),normalized:s.normalized(),attribute_index:i,metadata:o};const a=this._getQuantizationTransform(s,t);a&&(r[s.unique_id()].quantization_transform=a);const c=this._getOctahedronTransform(s,t);c&&(r[s.unique_id()].octahedron_transform=c)}return r}_getMeshData(e,t,r){const i=this._getMeshAttributes(t,e,r);if(!i.POSITION)throw new Error("DRACO: No position attribute found.");if(e instanceof this.draco.Mesh)switch(r.topology){case"triangle-strip":return{topology:"triangle-strip",mode:4,attributes:i,indices:{value:this._getTriangleStripIndices(e),size:1}};case"triangle-list":default:return{topology:"triangle-list",mode:5,attributes:i,indices:{value:this._getTriangleListIndices(e),size:1}}}return{topology:"point-list",mode:0,attributes:i}}_getMeshAttributes(e,t,r){const i={};for(const s of Object.values(e.attributes)){const o=this._deduceAttributeName(s,r);s.name=o;const a=this._getAttributeValues(t,s);if(a){const{value:c,size:l}=a;i[o]={value:c,size:l,byteOffset:s.byte_offset,byteStride:s.byte_stride,normalized:s.normalized}}}return i}_getTriangleListIndices(e){const r=e.num_faces()*3,i=r*EM,s=this.draco._malloc(i);try{return this.decoder.GetTrianglesUInt32Array(e,i,s),new Uint32Array(this.draco.HEAPF32.buffer,s,r).slice()}finally{this.draco._free(s)}}_getTriangleStripIndices(e){const t=new this.draco.DracoInt32Array;try{return this.decoder.GetTriangleStripsFromMesh(e,t),MM(t)}finally{this.draco.destroy(t)}}_getAttributeValues(e,t){const r=TM[t.data_type];if(!r)return console.warn(`DRACO: Unsupported attribute type ${t.data_type}`),null;const i=t.num_components,o=e.num_points()*i,a=o*r.BYTES_PER_ELEMENT,c=RM(this.draco,r);let l;const u=this.draco._malloc(a);try{const d=this.decoder.GetAttribute(e,t.attribute_index);this.decoder.GetAttributeDataArrayForAllPoints(e,d,c,a,u),l=new r(this.draco.HEAPF32.buffer,u,o).slice()}finally{this.draco._free(u)}return{value:l,size:i}}_deduceAttributeName(e,t){const r=e.unique_id;for(const[o,a]of Object.entries(t.extraAttributes||{}))if(a===r)return o;const i=e.attribute_type;for(const o in Ru)if(this.draco[o]===i)return Ru[o];const s=t.attributeNameEntry||"name";return e.metadata[s]?e.metadata[s].string:`CUSTOM_ATTRIBUTE_${r}`}_getTopLevelMetadata(e){const t=this.decoder.GetMetadata(e);return this._getDracoMetadata(t)}_getAttributeMetadata(e,t){const r=this.decoder.GetAttributeMetadata(e,t);return this._getDracoMetadata(r)}_getDracoMetadata(e){if(!e||!e.ptr)return{};const t={},r=this.metadataQuerier.NumEntries(e);for(let i=0;i<r;i++){const s=this.metadataQuerier.GetEntryName(e,i);t[s]=this._getDracoMetadataField(e,s)}return t}_getDracoMetadataField(e,t){const r=new this.draco.DracoInt32Array;try{this.metadataQuerier.GetIntEntryArray(e,t,r);const i=IM(r);return{int:this.metadataQuerier.GetIntEntry(e,t),string:this.metadataQuerier.GetStringEntry(e,t),double:this.metadataQuerier.GetDoubleEntry(e,t),intArray:i}}finally{this.draco.destroy(r)}}_disableAttributeTransforms(e){const{quantizedAttributes:t=[],octahedronAttributes:r=[]}=e,i=[...t,...r];for(const s of i)this.decoder.SkipAttributeTransform(this.draco[s])}_getQuantizationTransform(e,t){const{quantizedAttributes:r=[]}=t,i=e.attribute_type();if(r.map(o=>this.decoder[o]).includes(i)){const o=new this.draco.AttributeQuantizationTransform;try{if(o.InitFromAttribute(e))return{quantization_bits:o.quantization_bits(),range:o.range(),min_values:new Float32Array([1,2,3]).map(a=>o.min_value(a))}}finally{this.draco.destroy(o)}}return null}_getOctahedronTransform(e,t){const{octahedronAttributes:r=[]}=t,i=e.attribute_type();if(r.map(o=>this.decoder[o]).includes(i)){const o=new this.draco.AttributeQuantizationTransform;try{if(o.InitFromAttribute(e))return{quantization_bits:o.quantization_bits()}}finally{this.draco.destroy(o)}}return null}}function RM(n,e){switch(e){case Float32Array:return n.DT_FLOAT32;case Int8Array:return n.DT_INT8;case Int16Array:return n.DT_INT16;case Int32Array:return n.DT_INT32;case Uint8Array:return n.DT_UINT8;case Uint16Array:return n.DT_UINT16;case Uint32Array:return n.DT_UINT32;default:return n.DT_INVALID}}function IM(n){const e=n.size(),t=new Int32Array(e);for(let r=0;r<e;r++)t[r]=n.GetValue(r);return t}function MM(n){const e=n.size(),t=new Int32Array(e);for(let r=0;r<e;r++)t[r]=n.GetValue(r);return t}const LM={dataType:null,batchType:null,name:"Draco",id:"draco",module:"draco",version:xM,worker:!0,extensions:["drc"],mimeTypes:["application/octet-stream"],binary:!0,tests:["DRACO"],options:{draco:{decoderType:typeof WebAssembly=="object"?"wasm":"js",extraAttributes:{},attributeNameEntry:void 0}}},CM={...LM,parse:PM};async function PM(n,e){var i;const{draco:t}=await _M(Ku(e),((i=e==null?void 0:e.draco)==null?void 0:i.decoderType)||"wasm"),r=new AM(t);try{return r.parseSync(n,e==null?void 0:e.draco)}finally{r.destroy()}}function BM(n){const e={};for(const t in n){const r=n[t];if(t!=="indices"){const i=em(r);e[t]=i}}return e}function em(n){const{buffer:e,size:t,count:r}=NM(n);return{value:e,size:t,byteOffset:0,count:r,type:kh(t),componentType:zi(e)}}function NM(n){let e=n,t=1,r=0;return n&&n.value&&(e=n.value,t=n.size||1),e&&(ArrayBuffer.isView(e)||(e=OM(e,Float32Array)),r=e.length/t),{buffer:e,size:t,count:r}}function OM(n,e,t=!1){return n?Array.isArray(n)?new e(n):t&&!(n instanceof e)?new e(n):n:null}const et="KHR_draco_mesh_compression",FM=et;function UM(n,e,t){const r=new Q(n);for(const i of tm(r))r.getObjectExtension(i,et)}async function DM(n,e,t){var s;if(!((s=e==null?void 0:e.gltf)!=null&&s.decompressMeshes))return;const r=new Q(n),i=[];for(const o of tm(r))r.getObjectExtension(o,et)&&i.push($M(r,o,e,t));await Promise.all(i),r.removeExtension(et)}function kM(n,e={}){const t=new Q(n);for(const r of t.json.meshes||[])VM(r),t.addRequiredExtension(et)}async function $M(n,e,t,r){const i=n.getObjectExtension(e,et);if(!i)return;const s=n.getTypedArrayForBufferView(i.bufferView),o=qu(s.buffer,s.byteOffset),a={...t};delete a["3d-tiles"];const c=await Vu(o,CM,a,r),l=BM(c.attributes);for(const[u,d]of Object.entries(l))if(u in e.attributes){const h=e.attributes[u],m=n.getAccessor(h);m!=null&&m.min&&(m!=null&&m.max)&&(d.min=m.min,d.max=m.max)}e.attributes=l,c.indices&&(e.indices=em(c.indices)),n.removeObjectExtension(e,et),GM(e)}function VM(n,e,t=4,r,i){var u;if(!r.DracoWriter)throw new Error("options.gltf.DracoWriter not provided");const s=r.DracoWriter.encodeSync({attributes:n}),o=(u=i==null?void 0:i.parseSync)==null?void 0:u.call(i,{attributes:n}),a=r._addFauxAttributes(o.attributes),c=r.addBufferView(s);return{primitives:[{attributes:a,mode:t,extensions:{[et]:{bufferView:c,attributes:a}}}]}}function GM(n){if(!n.attributes&&Object.keys(n.attributes).length>0)throw new Error("glTF: Empty primitive detected: Draco decompression failure?")}function*tm(n){for(const e of n.json.meshes||[])for(const t of e.primitives)yield t}const zM=Object.freeze(Object.defineProperty({__proto__:null,decode:DM,encode:kM,name:FM,preprocess:UM},Symbol.toStringTag,{value:"Module"})),qt="KHR_texture_transform",WM=qt,Nr=new Ge,HM=new Ie,jM=new Ie;async function XM(n,e){var s;const t=new Q(n);if(!t.hasExtension(qt)||!((s=e.gltf)!=null&&s.loadBuffers))return;const i=n.json.materials||[];for(let o=0;o<i.length;o++)KM(o,n,t);i.some(o=>rc(o).length>0)||t.removeExtension(qt)}function KM(n,e,t){var a,c;const r=(a=e.json.materials)==null?void 0:a[n],i=rc(r),s=new Map;let o=qM(e);for(const l of i){const u=(c=l.extensions)==null?void 0:c[qt];if(u){const d=u.texCoord??l.texCoord??0,h=YM(d,u);let m=s.get(h);if(!m){if(m={sourceTexCoord:d,texCoord:o,matrix:tL(u)},!QM(e,n,m))continue;o++,s.set(h,m)}l.texCoord=m.texCoord,t.removeObjectExtension(l,qt),l.extensions&&Object.keys(l.extensions).length===0&&delete l.extensions}}}function rc(n){if(!n||typeof n!="object")return[];const e=n,t=[],r=e.extensions;Number.isFinite(e.index)&&(r!=null&&r[qt])&&t.push(e);for(const[i,s]of Object.entries(e))i!=="extras"&&t.push(...rc(s));return t}function qM(n){let e=-1;for(const t of n.json.meshes||[])for(const r of t.primitives)for(const i of Object.keys(r.attributes)){const s=/^TEXCOORD_(\d+)$/.exec(i);s&&(e=Math.max(e,Number(s[1])))}return e+1}function YM(n,e){const{offset:t=[0,0],rotation:r=0,scale:i=[1,1]}=e;return JSON.stringify([n,t,r,i])}function QM(n,e,t){const r=[],i=n.json.meshes||[];for(const s of i)for(const o of s.primitives){const a=o.material;Number.isFinite(a)&&e===a&&r.push(o)}if(r.length===0||r.some(s=>!ZM(n,s,t.sourceTexCoord)))return!1;for(const s of r)JM(n,s,t);return!0}function ZM(n,e,t){var o,a;const r=e.attributes[`TEXCOORD_${t}`];if(!Number.isFinite(r))return!1;const i=(o=n.json.accessors)==null?void 0:o[r];if(!i||i.bufferView===void 0||i.sparse)return!1;const s=(a=n.json.bufferViews)==null?void 0:a[i.bufferView];return!!(s&&n.buffers[s.buffer])}function JM(n,e,t){var a,c;const{sourceTexCoord:r,texCoord:i,matrix:s}=t,o=e.attributes[`TEXCOORD_${r}`];if(Number.isFinite(o)){const l=(a=n.json.accessors)==null?void 0:a[o];if(l&&l.bufferView!==void 0){const u=(c=n.json.bufferViews)==null?void 0:c[l.bufferView];if(u){const{arrayBuffer:d,byteOffset:h}=n.buffers[u.buffer],m=(h||0)+(l.byteOffset||0)+(u.byteOffset||0),{ArrayType:p,length:g}=li(l,u),b=Dh[l.componentType],_=Uh[l.type],y=u.byteStride||b*_,v=new Float32Array(g);for(let w=0;w<l.count;w++){const x=new p(d,m+w*y,2);Nr.set(x[0],x[1],1),Nr.transformByMatrix3(s),v.set([Nr[0],Nr[1]],w*_)}eL(i,l,e,n,v)}}}}function eL(n,e,t,r,i){r.buffers.push({arrayBuffer:Xn(i.buffer),byteOffset:0,byteLength:i.buffer.byteLength}),r.json.bufferViews=r.json.bufferViews||[];const s=r.json.bufferViews;s.push({buffer:r.buffers.length-1,byteLength:i.buffer.byteLength,byteOffset:0});const o=r.json.accessors;o&&(o.push({bufferView:(s==null?void 0:s.length)-1,byteOffset:0,componentType:5126,count:e.count,type:"VEC2"}),t.attributes[`TEXCOORD_${n}`]=o.length-1)}function tL(n){const{offset:e=[0,0],rotation:t=0,scale:r=[1,1]}=n,i=new Ie().set(1,0,0,0,1,0,e[0],e[1],1),s=HM.set(Math.cos(t),Math.sin(t),0,-Math.sin(t),Math.cos(t),0,0,0,1),o=jM.set(r[0],0,0,0,r[1],0,0,0,1);return i.multiplyRight(s).multiplyRight(o)}const nL=Object.freeze(Object.defineProperty({__proto__:null,decode:XM,name:WM},Symbol.toStringTag,{value:"Module"})),lt="KHR_lights_punctual",rL=lt;async function iL(n){const e=new Q(n),{json:t}=e,r=e.getExtension(lt);r&&(e.json.lights=r.lights,e.removeExtension(lt));for(const i of t.nodes||[]){const s=e.getObjectExtension(i,lt);s&&(i.light=s.light),e.removeObjectExtension(i,lt)}}async function sL(n){const e=new Q(n),{json:t}=e;if(t.lights){const r=e.addExtension(lt);oe(!r.lights),r.lights=t.lights,delete t.lights}if(e.json.lights){for(const r of e.json.lights){const i=r.node;e.addObjectExtension(i,lt,r)}delete e.json.lights}}const oL=Object.freeze(Object.defineProperty({__proto__:null,decode:iL,encode:sL,name:rL},Symbol.toStringTag,{value:"Module"})),Wn="KHR_materials_unlit",aL=Wn;async function cL(n){const e=new Q(n),{json:t}=e;for(const r of t.materials||[])r.extensions&&r.extensions.KHR_materials_unlit&&(r.unlit=!0),e.removeObjectExtension(r,Wn);e.removeExtension(Wn)}function lL(n){const e=new Q(n),{json:t}=e;if(e.materials)for(const r of t.materials||[])r.unlit&&(delete r.unlit,e.addObjectExtension(r,Wn,{}),e.addExtension(Wn))}const uL=Object.freeze(Object.defineProperty({__proto__:null,decode:cL,encode:lL,name:aL},Symbol.toStringTag,{value:"Module"})),gn="KHR_techniques_webgl",fL=gn;async function dL(n){const e=new Q(n),{json:t}=e,r=e.getExtension(gn);if(r){const i=mL(r,e);for(const s of t.materials||[]){const o=e.getObjectExtension(s,gn);o&&(s.technique=Object.assign({},o,i[o.technique]),s.technique.values=pL(s.technique,e)),e.removeObjectExtension(s,gn)}e.removeExtension(gn)}}async function hL(n,e){}function mL(n,e){const{programs:t=[],shaders:r=[],techniques:i=[]}=n,s=new TextDecoder;return r.forEach(o=>{if(Number.isFinite(o.bufferView))o.code=s.decode(e.getTypedArrayForBufferView(o.bufferView));else throw new Error("KHR_techniques_webgl: no shader code")}),t.forEach(o=>{o.fragmentShader=r[o.fragmentShader],o.vertexShader=r[o.vertexShader]}),i.forEach(o=>{o.program=t[o.program]}),i}function pL(n,e){const t=Object.assign({},n.values);return Object.keys(n.uniforms||{}).forEach(r=>{n.uniforms[r].value&&!(r in t)&&(t[r]=n.uniforms[r].value)}),Object.keys(t).forEach(r=>{typeof t[r]=="object"&&t[r].index!==void 0&&(t[r].texture=e.getTexture(t[r].index))}),t}const gL=Object.freeze(Object.defineProperty({__proto__:null,decode:dL,encode:hL,name:fL},Symbol.toStringTag,{value:"Module"})),nm=[KR,yR,oM,iM,dM,lM,pM,zM,oL,uL,gL,nL,fI];async function bL(n,e={},t){var i;const r=nm.filter(s=>rm(s.name,e));for(const s of r)await((i=s.preprocess)==null?void 0:i.call(s,n,e,t))}async function _L(n,e={},t){var i;const r=nm.filter(s=>rm(s.name,e));for(const s of r)await((i=s.decode)==null?void 0:i.call(s,n,e,t))}function rm(n,e){var i;const t=((i=e==null?void 0:e.gltf)==null?void 0:i.excludeExtensions)||{};return!(n in t&&!t[n])}const Js="KHR_binary_glTF";function yL(n){const e=new Q(n),{json:t}=e;for(const r of t.images||[]){const i=e.getObjectExtension(r,Js);i&&Object.assign(r,i),e.removeObjectExtension(r,Js)}t.buffers&&t.buffers[0]&&delete t.buffers[0].uri,e.removeExtension(Js)}const Iu={accessors:"accessor",animations:"animation",buffers:"buffer",bufferViews:"bufferView",images:"image",materials:"material",meshes:"mesh",nodes:"node",samplers:"sampler",scenes:"scene",skins:"skin",textures:"texture"},vL={accessor:"accessors",animations:"animation",buffer:"buffers",bufferView:"bufferViews",image:"images",material:"materials",mesh:"meshes",node:"nodes",sampler:"samplers",scene:"scenes",skin:"skins",texture:"textures"};class xL{constructor(){f(this,"idToIndexMap",{animations:{},accessors:{},buffers:{},bufferViews:{},images:{},materials:{},meshes:{},nodes:{},samplers:{},scenes:{},skins:{},textures:{}});f(this,"json")}normalize(e,t){this.json=e.json;const r=e.json;switch(r.asset&&r.asset.version){case"2.0":return;case void 0:case"1.0":break;default:console.warn(`glTF: Unknown version ${r.asset.version}`);return}if(!t.normalize)throw new Error("glTF v1 is not supported.");console.warn("Converting glTF v1 to glTF v2 format. This is experimental and may fail."),this._addAsset(r),this._convertTopLevelObjectsToArrays(r),yL(e),this._convertObjectIdsToArrayIndices(r),this._updateObjects(r),this._updateMaterial(r)}_addAsset(e){e.asset=e.asset||{},e.asset.version="2.0",e.asset.generator=e.asset.generator||"Normalized to glTF 2.0 by loaders.gl"}_convertTopLevelObjectsToArrays(e){for(const t in Iu)this._convertTopLevelObjectToArray(e,t)}_convertTopLevelObjectToArray(e,t){const r=e[t];if(!(!r||Array.isArray(r))){e[t]=[];for(const i in r){const s=r[i];s.id=s.id||i;const o=e[t].length;e[t].push(s),this.idToIndexMap[t][i]=o}}}_convertObjectIdsToArrayIndices(e){for(const t in Iu)this._convertIdsToIndices(e,t);"scene"in e&&(e.scene=this._convertIdToIndex(e.scene,"scene"));for(const t of e.textures)this._convertTextureIds(t);for(const t of e.meshes)this._convertMeshIds(t);for(const t of e.nodes)this._convertNodeIds(t);for(const t of e.scenes)this._convertSceneIds(t)}_convertTextureIds(e){e.source&&(e.source=this._convertIdToIndex(e.source,"image"))}_convertMeshIds(e){for(const t of e.primitives){const{attributes:r,indices:i,material:s}=t;for(const o in r)r[o]=this._convertIdToIndex(r[o],"accessor");i&&(t.indices=this._convertIdToIndex(i,"accessor")),s&&(t.material=this._convertIdToIndex(s,"material"))}}_convertNodeIds(e){e.children&&(e.children=e.children.map(t=>this._convertIdToIndex(t,"node"))),e.meshes&&(e.meshes=e.meshes.map(t=>this._convertIdToIndex(t,"mesh")))}_convertSceneIds(e){e.nodes&&(e.nodes=e.nodes.map(t=>this._convertIdToIndex(t,"node")))}_convertIdsToIndices(e,t){e[t]||(console.warn(`gltf v1: json doesn't contain attribute ${t}`),e[t]=[]);for(const r of e[t])for(const i in r){const s=r[i],o=this._convertIdToIndex(s,i);r[i]=o}}_convertIdToIndex(e,t){const r=vL[t];if(r in this.idToIndexMap){const i=this.idToIndexMap[r][e];if(!Number.isFinite(i))throw new Error(`gltf v1: failed to resolve ${t} with id ${e}`);return i}return e}_updateObjects(e){for(const t of this.json.buffers)delete t.type}_updateMaterial(e){var t,r,i;for(const s of e.materials){s.pbrMetallicRoughness={baseColorFactor:[1,1,1,1],metallicFactor:1,roughnessFactor:1};const o=((t=s.values)==null?void 0:t.tex)||((r=s.values)==null?void 0:r.texture2d_0)||((i=s.values)==null?void 0:i.diffuseTex),a=e.textures.findIndex(c=>c.id===o);a!==-1&&(s.pbrMetallicRoughness.baseColorTexture={index:a})}}}function SL(n,e={}){return new xL().normalize(n,e)}function wL(n,e){const t=n.basis,r=t==null?void 0:t.format;return{...n,core:{...n.core,mimeType:e},basis:{...t,format:r&&r!=="auto"?r:Jo(t==null?void 0:t.supportedTextureFormats)}}}async function TL(n,e,t=0,r,i){var s,o,a;return EL(n,e,t,r),SL(n,{normalize:(s=r==null?void 0:r.gltf)==null?void 0:s.normalize}),await bL(n,r,i),(o=r==null?void 0:r.gltf)!=null&&o.loadBuffers&&n.json.buffers&&await AL(n,r,i),(a=r==null?void 0:r.gltf)!=null&&a.loadImages&&await RL(n,r,i),await _L(n,r,i),n}function EL(n,e,t,r){var o,a;if((o=r.core)!=null&&o.baseUrl&&(n.baseUri=(a=r.core)==null?void 0:a.baseUrl),e instanceof ArrayBuffer&&!XI(e,t,r.glb)&&(e=new TextDecoder().decode(e)),typeof e=="string")n.json=jm(e);else if(e instanceof ArrayBuffer){const c={};t=KI(c,e,t,r.glb),oe(c.type==="glTF",`Invalid GLB magic string ${c.type}`),n._glb=c,n.json=c.json}else oe(!1,"GLTF: must be ArrayBuffer or string");const i=n.json.buffers||[];if(n.buffers=new Array(i.length).fill(null),n._glb&&n._glb.header.hasBinChunk){const{binChunks:c}=n._glb;n.buffers[0]={arrayBuffer:c[0].arrayBuffer,byteOffset:c[0].byteOffset,byteLength:c[0].byteLength}}const s=n.json.images||[];n.images=new Array(s.length).fill({})}async function AL(n,e,t){var i,s;const r=n.json.buffers||[];for(let o=0;o<r.length;++o){const a=r[o];if(a.uri){const{fetch:c}=t;oe(c);const l=qh(a.uri,e,t),u=await((i=t==null?void 0:t.fetch)==null?void 0:i.call(t,l)),d=await((s=u==null?void 0:u.arrayBuffer)==null?void 0:s.call(u));n.buffers[o]={arrayBuffer:d,byteOffset:0,byteLength:d.byteLength},delete a.uri}else n.buffers[o]===null&&(n.buffers[o]={arrayBuffer:new ArrayBuffer(a.byteLength),byteOffset:0,byteLength:a.byteLength})}}async function RL(n,e,t){const r=IL(n),i=n.json.images||[],s=[];for(const o of r)s.push(ML(n,i[o],o,e,t));return await Promise.all(s)}function IL(n){const e=new Set,t=n.json.textures||[];for(const r of t)r.source!==void 0&&e.add(r.source);return Array.from(e).sort()}async function ML(n,e,t,r,i){let s;if(e.uri&&!e.hasOwnProperty("bufferView")){const c=qh(e.uri,r,i),{fetch:l}=i;s=await(await l(c)).arrayBuffer(),e.bufferView={data:s}}if(Number.isFinite(e.bufferView)){const c=iR(n.json,n.buffers,e.bufferView);s=qu(c.buffer,c.byteOffset,c.byteLength)}oe(s,"glTF image has no data");const o=wL(r,e.mimeType);let a=await Vu(s,[Bg,$I],o,i);a&&a[0]&&(a={compressed:!0,mipmaps:!1,width:a[0].width,height:a[0].height,data:a[0]}),n.images=n.images||[],n.images[t]=a}const Mu={dataType:null,batchType:null,name:"glTF",id:"gltf",module:"gltf",version:dI,extensions:["gltf","glb"],mimeTypes:["model/gltf+json","model/gltf-binary"],text:!0,binary:!0,tests:["glTF"],parse:LL,options:{gltf:{normalize:!0,loadBuffers:!0,loadImages:!0,decompressMeshes:!0}}};async function LL(n,e={},t){var o;const r={...Mu.options,...e};r.gltf={...Mu.options.gltf,...r.gltf};const i=((o=e==null?void 0:e.glb)==null?void 0:o.byteOffset)||0;return await TL({},n,i,r,t)}const CL={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},PL={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},be={TEXTURE_MAG_FILTER:10240,TEXTURE_MIN_FILTER:10241,TEXTURE_WRAP_S:10242,TEXTURE_WRAP_T:10243,REPEAT:10497,LINEAR:9729,NEAREST_MIPMAP_LINEAR:9986},BL={magFilter:be.TEXTURE_MAG_FILTER,minFilter:be.TEXTURE_MIN_FILTER,wrapS:be.TEXTURE_WRAP_S,wrapT:be.TEXTURE_WRAP_T},NL={[be.TEXTURE_MAG_FILTER]:be.LINEAR,[be.TEXTURE_MIN_FILTER]:be.NEAREST_MIPMAP_LINEAR,[be.TEXTURE_WRAP_S]:be.REPEAT,[be.TEXTURE_WRAP_T]:be.REPEAT};function OL(){return{id:"default-sampler",parameters:NL}}function FL(n){return PL[n]}function UL(n){return CL[n]}class DL{constructor(){f(this,"baseUri","");f(this,"jsonUnprocessed");f(this,"json");f(this,"buffers",[]);f(this,"images",[])}postProcess(e,t={}){const{json:r,buffers:i=[],images:s=[]}=e,{baseUri:o=""}=e;return oe(r),this.baseUri=o,this.buffers=i,this.images=s,this.jsonUnprocessed=r,this.json=this._resolveTree(e.json,t),this.json}_resolveTree(e,t={}){const r={...e};return this.json=r,e.bufferViews&&(r.bufferViews=e.bufferViews.map((i,s)=>this._resolveBufferView(i,s))),e.images&&(r.images=e.images.map((i,s)=>this._resolveImage(i,s))),e.samplers&&(r.samplers=e.samplers.map((i,s)=>this._resolveSampler(i,s))),e.textures&&(r.textures=e.textures.map((i,s)=>this._resolveTexture(i,s))),e.accessors&&(r.accessors=e.accessors.map((i,s)=>this._resolveAccessor(i,s))),e.materials&&(r.materials=e.materials.map((i,s)=>this._resolveMaterial(i,s))),e.meshes&&(r.meshes=e.meshes.map((i,s)=>this._resolveMesh(i,s))),e.nodes&&(r.nodes=e.nodes.map((i,s)=>this._resolveNode(i,s)),r.nodes=r.nodes.map((i,s)=>this._resolveNodeChildren(i))),e.skins&&(r.skins=e.skins.map((i,s)=>this._resolveSkin(i,s))),e.scenes&&(r.scenes=e.scenes.map((i,s)=>this._resolveScene(i,s))),typeof this.json.scene=="number"&&r.scenes&&(r.scene=r.scenes[this.json.scene]),r}getScene(e){return this._get(this.json.scenes,e)}getNode(e){return this._get(this.json.nodes,e)}getSkin(e){return this._get(this.json.skins,e)}getMesh(e){return this._get(this.json.meshes,e)}getMaterial(e){return this._get(this.json.materials,e)}getAccessor(e){return this._get(this.json.accessors,e)}getCamera(e){return this._get(this.json.cameras,e)}getTexture(e){return this._get(this.json.textures,e)}getSampler(e){return this._get(this.json.samplers,e)}getImage(e){return this._get(this.json.images,e)}getBufferView(e){return this._get(this.json.bufferViews,e)}getBuffer(e){return this._get(this.json.buffers,e)}_get(e,t){if(typeof t=="object")return t;const r=e&&e[t];return r||console.warn(`glTF file error: Could not find ${e}[${t}]`),r}_resolveScene(e,t){return{...e,id:e.id||`scene-${t}`,nodes:(e.nodes||[]).map(r=>this.getNode(r))}}_resolveNode(e,t){const r={...e,id:(e==null?void 0:e.id)||`node-${t}`};return e.mesh!==void 0&&(r.mesh=this.getMesh(e.mesh)),e.camera!==void 0&&(r.camera=this.getCamera(e.camera)),e.skin!==void 0&&(r.skin=this.getSkin(e.skin)),e.meshes!==void 0&&e.meshes.length&&(r.mesh=e.meshes.reduce((i,s)=>{const o=this.getMesh(s);return i.id=o.id,i.primitives=i.primitives.concat(o.primitives),i},{primitives:[]})),r}_resolveNodeChildren(e){return e.children&&(e.children=e.children.map(t=>this.getNode(t))),e}_resolveSkin(e,t){const r=typeof e.inverseBindMatrices=="number"?this.getAccessor(e.inverseBindMatrices):void 0;return{...e,id:e.id||`skin-${t}`,inverseBindMatrices:r}}_resolveMesh(e,t){const r={...e,id:e.id||`mesh-${t}`,primitives:[]};return e.primitives&&(r.primitives=e.primitives.map((i,s)=>{const o={...i,attributes:{},indices:void 0,material:void 0},a=i.attributes;for(const c in a)o.attributes[c]=this.getAccessor(a[c]);return i.indices!==void 0&&(o.indices=this.getAccessor(i.indices)),i.material!==void 0&&(o.material=this.getMaterial(i.material)),kL(o,r.id,s)})),r}_resolveMaterial(e,t){const r={...e,id:e.id||`material-${t}`};if(r.normalTexture&&(r.normalTexture={...r.normalTexture},r.normalTexture.texture=this.getTexture(r.normalTexture.index)),r.occlusionTexture&&(r.occlusionTexture={...r.occlusionTexture},r.occlusionTexture.texture=this.getTexture(r.occlusionTexture.index)),r.emissiveTexture&&(r.emissiveTexture={...r.emissiveTexture},r.emissiveTexture.texture=this.getTexture(r.emissiveTexture.index)),r.emissiveFactor||(r.emissiveFactor=r.emissiveTexture?[1,1,1]:[0,0,0]),r.pbrMetallicRoughness){r.pbrMetallicRoughness={...r.pbrMetallicRoughness};const i=r.pbrMetallicRoughness;i.baseColorTexture&&(i.baseColorTexture={...i.baseColorTexture},i.baseColorTexture.texture=this.getTexture(i.baseColorTexture.index)),i.metallicRoughnessTexture&&(i.metallicRoughnessTexture={...i.metallicRoughnessTexture},i.metallicRoughnessTexture.texture=this.getTexture(i.metallicRoughnessTexture.index))}return r}_resolveAccessor(e,t){const r=FL(e.componentType),i=UL(e.type),s=r*i,o={...e,id:e.id||`accessor-${t}`,bytesPerComponent:r,components:i,bytesPerElement:s,value:void 0,bufferView:void 0,sparse:void 0};if(e.bufferView!==void 0&&(o.bufferView=this.getBufferView(e.bufferView)),o.bufferView){const a=o.bufferView.buffer,{ArrayType:c,byteLength:l}=li(o,o.bufferView),u=(o.bufferView.byteOffset||0)+(o.byteOffset||0)+a.byteOffset;let d=Nn(a.arrayBuffer,u,l);o.bufferView.byteStride&&(d=this._getValueFromInterleavedBuffer(a,u,o.bufferView.byteStride,o.bytesPerElement,o.count)),o.value=new c(d)}else{const{ArrayType:a}=li(o,{byteLength:o.count*o.bytesPerElement});o.value=new a(o.count*o.components)}return e.sparse&&this._applySparseAccessor(o,e.sparse),o}_applySparseAccessor(e,t){const r=$L(t.indices.componentType),i=this._getTypedArrayFromBufferView(r,this.getBufferView(t.indices.bufferView),t.indices.byteOffset||0,t.count),s=e.value.constructor,o=this._getTypedArrayFromBufferView(s,this.getBufferView(t.values.bufferView),t.values.byteOffset||0,t.count*e.components);for(let a=0;a<t.count;a++){const c=Number(i[a]);oe(Number.isInteger(c)&&c>=0&&c<e.count,"glTF sparse accessor index is out of bounds");for(let l=0;l<e.components;l++){const u=c*e.components+l,d=a*e.components+l;Reflect.set(e.value,u,o[d])}}}_getTypedArrayFromBufferView(e,t,r,i){const s=i*e.BYTES_PER_ELEMENT;oe(r+s<=t.byteLength,"glTF sparse accessor data exceeds its buffer view");const o=t.buffer,a=o.byteOffset+(t.byteOffset||0)+r,c=Nn(o.arrayBuffer,a,s);return new e(c)}_getValueFromInterleavedBuffer(e,t,r,i,s){const o=new Uint8Array(s*i);for(let a=0;a<s;a++){const c=t+a*r;o.set(new Uint8Array(e.arrayBuffer.slice(c,c+i)),a*i)}return o.buffer}_resolveTexture(e,t){return{...e,id:e.id||`texture-${t}`,sampler:typeof e.sampler=="number"?this.getSampler(e.sampler):OL(),source:typeof e.source=="number"?this.getImage(e.source):void 0}}_resolveSampler(e,t){const r={id:e.id||`sampler-${t}`,...e,parameters:{}};for(const i in r){const s=this._enumSamplerParameter(i);s!==void 0&&(r.parameters[s]=r[i])}return r}_enumSamplerParameter(e){return BL[e]}_resolveImage(e,t){const r={...e,id:e.id||`image-${t}`,image:null,bufferView:e.bufferView!==void 0?this.getBufferView(e.bufferView):void 0},i=this.images[t];return i&&(r.image=i),r}_resolveBufferView(e,t){const r=e.buffer,i=this.buffers[r].arrayBuffer;let s=this.buffers[r].byteOffset||0;return e.byteOffset&&(s+=e.byteOffset),{id:`bufferView-${t}`,...e,buffer:this.buffers[r],data:new Uint8Array(i,s,e.byteLength)}}_resolveCamera(e,t){const r={...e,id:e.id||`camera-${t}`};return r.perspective,r.orthographic,r}}function kL(n,e,t){var c,l;if(n.mode!==2&&n.mode!==6)return n;const r=(c=n.indices)==null?void 0:c.value,i=((l=n.indices)==null?void 0:l.count)??VL(n),s=GL(r,i),o=s<=65535?Uint16Array:Uint32Array,a=n.mode===2?WL(r,i,o):HL(r,i,o);return n.mode=n.mode===2?1:4,n.indices={id:`${e}-primitive-${t}-portable-indices`,components:1,bytesPerComponent:o.BYTES_PER_ELEMENT,bytesPerElement:o.BYTES_PER_ELEMENT,componentType:o===Uint16Array?5123:5125,normalized:!1,count:a.length,type:"SCALAR",min:a.length?[zL(a)]:void 0,max:a.length?[s]:void 0,value:a},n}function $L(n){switch(n){case 5121:return Uint8Array;case 5123:return Uint16Array;case 5125:return Uint32Array;default:throw new Error(`Invalid glTF sparse index component type ${n}`)}}function VL(n){const e=Object.values(n.attributes)[0];return oe(e,"glTF primitive must define at least one attribute"),e.count}function GL(n,e){if(!n)return Math.max(0,e-1);let t=0;for(let r=0;r<e;r++)t=Math.max(t,Number(n[r]));return t}function zL(n){let e=1/0;for(const t of n)e=Math.min(e,t);return e}function Rn(n,e){return n?Number(n[e]):e}function WL(n,e,t){if(e<2)return new t(0);const r=new t(e*2);for(let i=0;i<e;i++)r[i*2]=Rn(n,i),r[i*2+1]=Rn(n,(i+1)%e);return r}function HL(n,e,t){const r=Math.max(0,e-2),i=new t(r*3);for(let s=0;s<r;s++)i[s*3]=Rn(n,0),i[s*3+1]=Rn(n,s+1),i[s*3+2]=Rn(n,s+2);return i}function RP(n,e){return new DL().postProcess(n,e)}const jL=le.createContext(null);function XL(n){return{longitude:n.center.lng,latitude:n.center.lat,zoom:n._seaLevelZoom??n.zoom,pitch:n.pitch,bearing:n.bearing,padding:n.padding,elevation:n._centerAltitude}}function KL(n){return Number.isFinite(n.longitude)||Number.isFinite(n.latitude)||Number.isFinite(n.zoom)||Number.isFinite(n.pitch)||Number.isFinite(n.bearing)}function qL(n,e){return!!(Number.isFinite(e.longitude)&&n.center.lng!==e.longitude||Number.isFinite(e.latitude)&&n.center.lat!==e.latitude||Number.isFinite(e.bearing)&&n.bearing!==e.bearing||Number.isFinite(e.pitch)&&n.pitch!==e.pitch||Number.isFinite(e.zoom)&&(n._seaLevelZoom??n.zoom)!==e.zoom||e.padding&&!n.isPaddingEqual(e.padding))}function Lu(){}function YL(n,e){const t=n._constrain,r=n._calcMatrices;if(n._constrain=Lu,n._calcMatrices=Lu,Number.isFinite(e.bearing)&&(n.bearing=e.bearing),Number.isFinite(e.pitch)&&(n.pitch=e.pitch),e.padding&&!n.isPaddingEqual(e.padding)&&(n.padding=e.padding),Number.isFinite(e.longitude)||Number.isFinite(e.latitude)){const i=n.center;n._center=new i.constructor(e.longitude??i.lng,e.latitude??i.lat)}if(Number.isFinite(e.zoom))if(n._centerAltitude=e.elevation??0,n.elevation){n._seaLevelZoom=e.zoom;const i=n.pixelsPerMeter/n.worldSize*n._centerAltitude,s=n._mercatorZfromZoom(e.zoom),o=n._mercatorZfromZoom(n._maxZoom),a=Math.max(s-i,o);n._setZoom(n._zoomFromMercatorZ(a))}else n._seaLevelZoom=null,n.zoom=e.zoom;n._constrain=t,n._calcMatrices=r,n._unmodified||(n._constrain(),n._calcMatrices())}const QL=new Set(["_calcMatrices","_calcFogMatrices","_updateCameraState","_updateSeaLevelZoom"]);function ZL(n){let e=!1,t={};const r=n;let i=null;const s={get(o,a){return a==="$reactViewState"?t:a==="$proposedTransform"?i:a==="$internalUpdate"?e:a==="_setZoom"?c=>{e&&(i==null||i[a](c)),Number.isFinite(t.zoom)||r[a](c)}:(e&&a==="_translateCameraConstrained"&&KL(t)&&(i=i||r.clone()),QL.has(a)?function(...c){i==null||i[a](...c),r[a](...c)}:e&&i?i[a]:r[a])},set(o,a,c){if(a==="$reactViewState")return t=c,YL(r,t),!0;if(a==="$proposedTransform")return i=c,!0;if(a==="$internalUpdate")return e=c,!0;let l=c;return a==="center"||a==="_center"?(Number.isFinite(t.longitude)||Number.isFinite(t.latitude))&&(l=new c.constructor(t.longitude??c.lng,t.latitude??c.lat)):a==="zoom"||a==="_zoom"||a==="_seaLevelZoom"?Number.isFinite(t.zoom)&&(l=r[a]):a==="_centerAltitude"?Number.isFinite(t.elevation)&&(l=r[a]):a==="pitch"||a==="_pitch"?Number.isFinite(t.pitch)&&(l=r[a]):(a==="bearing"||a==="rotation"||a==="angle")&&Number.isFinite(t.bearing)&&(l=r[a]),e&&l!==c&&(i=i||r.clone()),e&&i&&(i[a]=c),r[a]=l,!0}};return new Proxy(n,s)}const JL=["type","source","source-layer","minzoom","maxzoom","filter","layout"];function Cu(n){if(!n)return null;if(typeof n=="string"||("toJS"in n&&(n=n.toJS()),!n.layers))return n;const e={};for(const r of n.layers)e[r.id]=r;const t=n.layers.map(r=>{let i=null;"interactive"in r&&(i=Object.assign({},r),delete i.interactive);const s=e[r.ref];if(s){i=i||Object.assign({},r),delete i.ref;for(const o of JL)o in s&&(i[o]=s[o])}return i||r});return{...n,layers:t}}function at(n,e){if(n===e)return!0;if(!n||!e)return!1;if(Array.isArray(n)){if(!Array.isArray(e)||n.length!==e.length)return!1;for(let t=0;t<n.length;t++)if(!at(n[t],e[t]))return!1;return!0}else if(Array.isArray(e))return!1;if(typeof n=="object"&&typeof e=="object"){const t=Object.keys(n),r=Object.keys(e);if(t.length!==r.length)return!1;for(const i of t)if(!e.hasOwnProperty(i)||!at(n[i],e[i]))return!1;return!0}return!1}var Pu={};const Bu={version:8,sources:{},layers:[]},eC={minZoom:0,maxZoom:22,minPitch:0,maxPitch:85,maxBounds:[-180,-85.051129,180,85.051129],projection:"mercator",renderWorldCopies:!0},Nu={mousedown:"onMouseDown",mouseup:"onMouseUp",mouseover:"onMouseOver",mousemove:"onMouseMove",click:"onClick",dblclick:"onDblClick",mouseenter:"onMouseEnter",mouseleave:"onMouseLeave",mouseout:"onMouseOut",contextmenu:"onContextMenu",touchstart:"onTouchStart",touchend:"onTouchEnd",touchmove:"onTouchMove",touchcancel:"onTouchCancel"},Ou={movestart:"onMoveStart",move:"onMove",moveend:"onMoveEnd",dragstart:"onDragStart",drag:"onDrag",dragend:"onDragEnd",zoomstart:"onZoomStart",zoom:"onZoom",zoomend:"onZoomEnd",rotatestart:"onRotateStart",rotate:"onRotate",rotateend:"onRotateEnd",pitchstart:"onPitchStart",pitch:"onPitch",pitchend:"onPitchEnd"},Fu={wheel:"onWheel",boxzoomstart:"onBoxZoomStart",boxzoomend:"onBoxZoomEnd",boxzoomcancel:"onBoxZoomCancel",resize:"onResize",load:"onLoad",render:"onRender",idle:"onIdle",remove:"onRemove",data:"onData",styledata:"onStyleData",sourcedata:"onSourceData",error:"onError"},tC=["minZoom","maxZoom","minPitch","maxPitch","maxBounds","projection","renderWorldCopies"],nC=["scrollZoom","boxZoom","dragRotate","dragPan","keyboard","doubleClickZoom","touchZoomRotate","touchPitch"];class Yt{constructor(e,t,r){this._map=null,this._internalUpdate=!1,this._inRender=!1,this._hoveredFeatures=null,this._deferredEvents={move:!1,zoom:!1,pitch:!1,rotate:!1},this._onEvent=i=>{const s=this.props[Fu[i.type]];s?s(i):i.type==="error"&&console.error(i.error)},this._onPointerEvent=i=>{(i.type==="mousemove"||i.type==="mouseout")&&this._updateHover(i);const s=this.props[Nu[i.type]];s&&(this.props.interactiveLayerIds&&i.type!=="mouseover"&&i.type!=="mouseout"&&(i.features=this._hoveredFeatures||this._queryRenderedFeatures(i.point)),s(i),delete i.features)},this._onCameraEvent=i=>{if(!this._internalUpdate){const s=this.props[Ou[i.type]],o=this._proxyTransform;s&&(i.viewState=XL(o.$proposedTransform??o),s(i)),i.type==="moveend"&&(o.$proposedTransform=null)}i.type in this._deferredEvents&&(this._deferredEvents[i.type]=!1)},this._MapClass=e,this.props=t,this._initialize(r)}get map(){return this._map}get transform(){return this._map.transform}setProps(e){const t=this.props;this.props=e;const r=this._updateSettings(e,t),i=this._updateSize(e),s=this._updateViewState(e,!0);this._updateStyle(e,t),this._updateStyleComponents(e,t),this._updateHandlers(e,t),(r||i||s&&!this._map.isMoving())&&this.redraw()}static reuse(e,t){const r=Yt.savedMaps.pop();if(!r)return null;const i=r.map,s=i.getContainer();for(t.className=s.className;s.childNodes.length>0;)t.appendChild(s.childNodes[0]);i._container=t,r.setProps({...e,styleDiffing:!1}),i.resize();const{initialViewState:o}=e;return o&&(o.bounds?i.fitBounds(o.bounds,{...o.fitBoundsOptions,duration:0}):r._updateViewState(o,!1)),i.isStyleLoaded()?i.fire("load"):i.once("styledata",()=>i.fire("load")),i._update(),r}_initialize(e){const{props:t}=this,{mapStyle:r=Bu}=t,i={...t,...t.initialViewState,accessToken:t.mapboxAccessToken||rC()||null,container:e,style:Cu(r)},s=i.initialViewState||i.viewState||i;if(Object.assign(i,{center:[s.longitude||0,s.latitude||0],zoom:s.zoom||0,pitch:s.pitch||0,bearing:s.bearing||0}),t.gl){const d=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=()=>(HTMLCanvasElement.prototype.getContext=d,t.gl)}const o=new this._MapClass(i);s.padding&&o.setPadding(s.padding),t.cursor&&(o.getCanvas().style.cursor=t.cursor),this._createProxyTransform(o);const a=o._render;o._render=d=>{this._inRender=!0,a.call(o,d),this._inRender=!1};const c=o._renderTaskQueue.run;o._renderTaskQueue.run=d=>{this._proxyTransform.$internalUpdate=!0,c.call(o._renderTaskQueue,d),this._proxyTransform.$internalUpdate=!1,this._fireDefferedEvents()};const l=o.jumpTo;o.jumpTo=(...d)=>(this._proxyTransform.$internalUpdate=!0,l.apply(o,d),this._proxyTransform.$internalUpdate=!1,o);const u=o.fire;o.fire=this._fireEvent.bind(this,u),o.on("styledata",()=>{this._updateStyleComponents(this.props,{})}),o.on("sourcedata",()=>{this._updateStyleComponents(this.props,{})});for(const d in Nu)o.on(d,this._onPointerEvent);for(const d in Ou)o.on(d,this._onCameraEvent);for(const d in Fu)o.on(d,this._onEvent);this._map=o}recycle(){const t=this.map.getContainer().querySelector("[mapboxgl-children]");t==null||t.remove(),Yt.savedMaps.push(this)}destroy(){this._map.remove()}redraw(){const e=this._map;!this._inRender&&e.style&&(e._frame&&(e._frame.cancel(),e._frame=null),e._render())}_createProxyTransform(e){const t=ZL(e.transform);e.transform=t,e.painter.transform=t,this._proxyTransform=t}_updateSize(e){const{viewState:t}=e;if(t){const r=this._map;if(t.width!==r.transform.width||t.height!==r.transform.height)return r.resize(),!0}return!1}_updateViewState(e,t){const r=e.viewState||e,i=this._proxyTransform,{zoom:s,pitch:o,bearing:a}=i,c=qL(this._proxyTransform,r);if(i.$reactViewState=r,c&&t){const l=this._deferredEvents;l.move=!0,l.zoom||(l.zoom=s!==i.zoom),l.rotate||(l.rotate=a!==i.bearing),l.pitch||(l.pitch=o!==i.pitch)}return c}_updateSettings(e,t){const r=this._map;let i=!1;for(const s of tC)if((s in e||s in t)&&!at(e[s],t[s])){i=!0;const a=s in e?e[s]:eC[s],c=r[`set${s[0].toUpperCase()}${s.slice(1)}`];c==null||c.call(r,a)}return i}_updateStyle(e,t){if(e.cursor!==t.cursor&&(this._map.getCanvas().style.cursor=e.cursor||""),e.mapStyle!==t.mapStyle){const{mapStyle:r=Bu,styleDiffing:i=!0}=e,s={diff:i};return"localIdeographFontFamily"in e&&(s.localIdeographFontFamily=e.localIdeographFontFamily),this._map.setStyle(Cu(r),s),!0}return!1}_updateStyleComponents(e,t){const r=this._map;let i=!1;return r.isStyleLoaded()&&("light"in e&&r.setLight&&!at(e.light,t.light)&&(i=!0,r.setLight(e.light)),"fog"in e&&r.setFog&&!at(e.fog,t.fog)&&(i=!0,r.setFog(e.fog)),"terrain"in e&&r.setTerrain&&!at(e.terrain,t.terrain)&&(!e.terrain||r.getSource(e.terrain.source))&&(i=!0,r.setTerrain(e.terrain))),i}_updateHandlers(e,t){const r=this._map;let i=!1;for(const s of nC){const o=e[s]??!0,a=t[s]??!0;at(o,a)||(i=!0,o?r[s].enable(o):r[s].disable())}return i}_queryRenderedFeatures(e){const t=this._map,{interactiveLayerIds:r=[]}=this.props;try{return t.queryRenderedFeatures(e,{layers:r.filter(t.getLayer.bind(t))})}catch{return[]}}_updateHover(e){var i;const{props:t}=this;if(t.interactiveLayerIds&&(t.onMouseMove||t.onMouseEnter||t.onMouseLeave)){const s=e.type,o=((i=this._hoveredFeatures)==null?void 0:i.length)>0,a=this._queryRenderedFeatures(e.point),c=a.length>0;!c&&o&&(e.type="mouseleave",this._onPointerEvent(e)),this._hoveredFeatures=a,c&&!o&&(e.type="mouseenter",this._onPointerEvent(e)),e.type=s}else this._hoveredFeatures=null}_fireEvent(e,t,r){const i=this._map,s=this._proxyTransform,o=s.$internalUpdate;try{s.$internalUpdate=!1,e.call(i,t,r)}finally{s.$internalUpdate=o}return i}_fireDefferedEvents(){const e=this._map;this._internalUpdate=!0;for(const t in this._deferredEvents)this._deferredEvents[t]&&e.fire(t);this._internalUpdate=!1}}Yt.savedMaps=[];function rC(){let n=null;if(typeof location<"u"){const e=/access_token=([^&\/]*)/.exec(location.search);n=e&&e[1]}try{n=n||Pu.MapboxAccessToken}catch{}try{n=n||Pu.REACT_APP_MAPBOX_ACCESS_TOKEN}catch{}return n}const iC=["setMaxBounds","setMinZoom","setMaxZoom","setMinPitch","setMaxPitch","setRenderWorldCopies","setProjection","setStyle","addSource","removeSource","addLayer","removeLayer","setLayerZoomRange","setFilter","setPaintProperty","setLayoutProperty","setLight","setTerrain","setFog","remove"];function sC(n){if(!n)return null;const e=n.map,t={getMap:()=>e,getCenter:()=>n.transform.center,getZoom:()=>n.transform.zoom,getBearing:()=>n.transform.bearing,getPitch:()=>n.transform.pitch,getPadding:()=>n.transform.padding,getBounds:()=>n.transform.getBounds(),project:r=>{const i=e.transform;e.transform=n.transform;const s=e.project(r);return e.transform=i,s},unproject:r=>{const i=e.transform;e.transform=n.transform;const s=e.unproject(r);return e.transform=i,s},queryTerrainElevation:(r,i)=>{const s=e.transform;e.transform=n.transform;const o=e.queryTerrainElevation(r,i);return e.transform=s,o},queryRenderedFeatures:(r,i)=>{const s=e.transform;e.transform=n.transform;const o=e.queryRenderedFeatures(r,i);return e.transform=s,o}};for(const r of oC(e))!(r in t)&&!iC.includes(r)&&(t[r]=e[r].bind(e));return t}function oC(n){const e=new Set;let t=n;for(;t;){for(const r of Object.getOwnPropertyNames(t))r[0]!=="_"&&typeof n[r]=="function"&&r!=="fire"&&r!=="setEventedParent"&&e.add(r);t=Object.getPrototypeOf(t)}return Array.from(e)}const aC=typeof document<"u"?le.useLayoutEffect:le.useEffect,cC=["baseApiUrl","maxParallelImageRequests","workerClass","workerCount","workerUrl"];function lC(n,e){for(const r of cC)r in e&&(n[r]=e[r]);const{RTLTextPlugin:t="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js"}=e;t&&n.getRTLTextPluginStatus&&n.getRTLTextPluginStatus()==="unavailable"&&n.setRTLTextPlugin(t,r=>{r&&console.error(r)},!0)}const uC=le.createContext(null);function fC(n,e){const t=le.useContext(jL),[r,i]=le.useState(null),s=le.useRef(),{current:o}=le.useRef({mapLib:null,map:null});le.useEffect(()=>{const l=n.mapLib;let u=!0,d;return Promise.resolve(l||Bn(()=>import("./mapbox-uAfTz7z0.js").then(h=>h.m),__vite__mapDeps([0,1,2]))).then(h=>{if(!u)return;if(!h)throw new Error("Invalid mapLib");const m="Map"in h?h:h.default;if(!m.Map)throw new Error("Invalid mapLib");lC(m,n),n.reuseMaps&&(d=Yt.reuse(n,s.current)),d||(d=new Yt(m.Map,n,s.current)),o.map=sC(d),o.mapLib=m,i(d),t==null||t.onMapMount(o.map,n.id)}).catch(h=>{const{onError:m}=n;m?m({type:"error",target:null,error:h}):console.error(h)}),()=>{u=!1,d&&(t==null||t.onMapUnmount(n.id),n.reuseMaps?d.recycle():d.destroy())}},[]),aC(()=>{r&&r.setProps(n)}),le.useImperativeHandle(e,()=>o.map,[r]);const a=le.useMemo(()=>({position:"relative",width:"100%",height:"100%",...n.style}),[n.style]),c={height:"100%"};return le.createElement("div",{id:n.id,ref:s,style:a},r&&le.createElement(uC.Provider,{value:o},le.createElement("div",{"mapboxgl-children":"",style:c},n.children)))}const IP=le.forwardRef(fC);function Le(n,e,t=!1){if(t)return e===1?"float":`vec${e}`;switch(n){case"uint8":case"uint16":case"uint32":return e===1?"uint":`uvec${e}`;case"sint8":case"sint16":case"sint32":return e===1?"int":`ivec${e}`;default:return e===1?"float":`vec${e}`}}function im(n,e,t=!1){let r;if(t)switch(n){case"uint8":r="unorm8";break;case"sint8":r="snorm8";break;case"uint16":r="unorm16";break;case"sint16":r="snorm16";break;case"float32":r="float32";break;default:throw new Error(`Unsupported normalized vertex format for ${n}`)}else r=n;return e===1?r:e===3&&!r.startsWith("float32")&&!r.endsWith("32")?`${r}x3-webgl`:`${r}x${e}`}function ji(n){switch(n[0]){case"u":return"0u";case"s":return"0";default:return"0."}}function dC(n,e){switch(n){case"uint8":case"uint16":case"uint32":return`${Math.trunc(e)}u`;case"sint8":case"sint16":case"sint32":return`${Math.trunc(e)}`;default:return Number.isInteger(e)?`${e}.0`:`${e}`}}function hC(n){switch(n){case"uint8":return"r8uint";case"sint8":return"r8sint";case"uint16":return"r16uint";case"sint16":return"r16sint";case"uint32":return"r32uint";case"sint32":return"r32sint";case"float32":return"r32float";default:throw new Error(`Unsupported WebGL gather texture format for ${n}`)}}function mC(n){switch(n){case"uint32":return"usampler2D";case"sint32":return"isampler2D";case"float32":return"sampler2D";default:throw new Error(`Unsupported WebGL gather sampler type for ${n}`)}}const pC="GPGPU Operation Counts",gC="Transform Runs",bC=new ed;function rt({module:n,elementWise:e=!1,expression:t,inputs:r,output:i,operationType:s=i.type,outputBuffer:o}){const a=o.device,c=Xi("result",i.type,i.size,i.normalized),l=[n,c],u=[],d={},h=Le(i.type,1,i.normalized),m=Le(s,1,i.normalized);let p="",g=null;const b={TYPE:m,RESULT_LEN:i.size.toString()},_=_C(r);for(const[x,T]of _)l.push(sm(x,T.type,T.size,T.normalized,s)),u.push(om(x,T)),T instanceof W?d[x]=T.buffer:(g=g||Ee.createOrReuse(a,o.byteLength),d[x]=g),p+=`TYPE ${x}[${T.size}]; get_${x}(${x});
`,b[`${x.toUpperCase()}_LEN`]=T.size.toString();let y="";if(t)for(let x=0;x<i.size;x++)y+=`result[${x}]=${t(x)};
`;else if(e)for(let x=0;x<i.size;x++){const T=ji(m),A=_.map(([M,L])=>x<L.size?`${M}[${x}]`:T);y+=`result[${x}]=${n.name}(${A.join(", ")});
`}else y=`${n.name}(${_.map(([x])=>x).join(", ")}, result);`;const v=`#version 300 es

void main() {
${p}
${h} result[${i.size}];
${y}
set_result(result);
}
  `,w=new jt(a,{vs:v,shaderAssembler:bC,defines:b,modules:l,bufferLayout:u,vertexCount:1,instanceCount:i.length,attributes:d,feedbackBufferMode:"interleaved",outputs:c.varyings});a.statsManager.getStats(pC).get(gC).incrementCount(),w.run({inputBuffers:d,outputBuffers:{[c.varyings[0]]:i.offset===0?o:{buffer:o,byteOffset:i.offset,byteLength:i.byteLength}}}),g&&Ee.recycle(g)}function _C(n){return Array.isArray(n)?n.map((e,t)=>[`x${t}`,e]):Object.entries(n)}function sm(n,e,t,r=!1,i=e){let s="",o="";for(let c=0;c<t;c+=4){const l=Math.min(t-c,4),u=Le(e,l,r);s+=`in ${u} a${n}_${c};
`;for(let d=0;d<l;d++){let h=`a${n}_${c}`;l>1&&(h=`${h}[${d}]`),(r||e!==i)&&(h=`TYPE(${h})`),o+=`v[${c+d}]=${h};
`}}const a=`
${s}
void get_${n}(out TYPE v[${t}]) {
  ${o}
}
`;return{name:n,vs:a}}function om(n,e){const t={name:n,stepMode:e.isConstant?"vertex":"instance",byteStride:e.stride,attributes:[]};for(let r=0;r<e.size;r+=4){const i=Math.min(e.size-r,4);t.attributes.push({attribute:`a${n}_${r}`,format:im(e.type,i,e.normalized),byteOffset:e.offset+e.ValueType.BYTES_PER_ELEMENT*r})}return t}function Xi(n,e,t,r=!1){const i=[],s=Le(e,1,r);let o="",a="";for(let c=0;c<t;c+=4){const l=Math.min(t-c,4),u=Le(e,l,r);i.push(`${n}_${c}`),o+=`flat out ${u} ${n}_${c};
`;const d=Array.from({length:l},(h,m)=>c+m);a+=`${n}_${c} = ${u}(${d.map(h=>`v[${h}]`).join(",")});
`}return{name:n,varyings:i,vs:`
${o}
void set_${n}(in ${s} v[${t}]) {
  ${a}
}
`}}const yC=`TYPE arithmetic_add(TYPE x, TYPE y) {
  return x + y;
}

TYPE arithmetic_subtract(TYPE x, TYPE y) {
  return x - y;
}

TYPE arithmetic_multiply(TYPE x, TYPE y) {
  return x * y;
}

TYPE arithmetic_divide(TYPE x, TYPE y) {
  return x / y;
}

float arithmetic_tan(float x) {
  return tan_fp32(x);
}
`,am=({inputs:n,output:e,target:t})=>{const r=e.type,i=Le(r,1,e.normalized),s=ji(i),o=n.namedInputs;return rt({module:{name:"arithmetic",dependencies:[xd],vs:yC},inputs:o,output:e,operationType:r,outputBuffer:t,expression:a=>bh(n.expression,{operations:Xa,inputs:o,laneIndex:a,formatInput:c=>`${c}[${a}]`,formatOutOfBoundsInput:c=>o[c].size===1?`${c}[0]`:s,formatLiteral:c=>{const l=Array.isArray(c)?c[a]??0:c;return`${i}(${dC(r,l)})`},formatCall:(c,l)=>`${c}(${l.join(", ")})`})}),{success:!0}},vC="GPGPU Operation Counts",xC="Transform Runs",SC=({inputs:n,output:e,target:t})=>{const{sourceValues:r}=n,i=t.device;if(r.length===0){const d=new e.ValueType(e.length*e.size);return t.write(d),{success:!0,value:d}}if(r.isConstant){const d=r.value,h=new e.ValueType(e.length*e.size);for(let m=0;m<e.length;m++){const p=d[m];h[m*2]=p,h[m*2+1]=p}return t.write(h),{success:!0,value:h}}const s=i.createTexture({width:1,height:e.length,format:"rg32float",usage:N.RENDER|N.COPY_SRC|N.COPY_DST}),o=i.createFramebuffer({colorAttachments:[s]}),a=`#version 300 es

flat out float extent_value;

void main() {
  float sourceValues[SOURCE_VALUES_LEN];
  get_sourceValues(sourceValues);
  extent_value = sourceValues[gl_VertexID];

  float y = (float(gl_VertexID) + 0.5) / float(CHANNEL_COUNT) * 2.0 - 1.0;
  gl_Position = vec4(0.0, y, 0.0, 1.0);
  gl_PointSize = 1.0;
}
  `,c=`#version 300 es

precision highp float;

flat in float extent_value;
out vec2 fragColor;

void main() {
  fragColor = vec2(-extent_value, extent_value);
}
  `,l=new Ht(i,{vs:a,fs:c,topology:"point-list",parameters:{depthCompare:"always",blend:!0,blendColorSrcFactor:"one",blendColorDstFactor:"one",blendColorOperation:"max",blendAlphaSrcFactor:"one",blendAlphaDstFactor:"one",blendAlphaOperation:"max"},modules:[sm("sourceValues",r.type,r.size,r.normalized)],defines:{TYPE:"float",SOURCE_VALUES_LEN:r.size.toString(),CHANNEL_COUNT:e.length.toString()},attributes:{sourceValues:r.buffer},bufferLayout:[om("sourceValues",r)],instanceCount:r.length,vertexCount:e.length,disableWarnings:!0}),u=Ee.createOrReuse(i,e.byteLength);try{const d=i.beginRenderPass({framebuffer:o,parameters:{viewport:[0,0,1,e.length]},clearColor:[-Uu,-Uu,0,0],clearDepth:!1,clearStencil:!1});i.statsManager.getStats(vC).get(xC).incrementCount(),l.draw(d),d.end();const h=i.createCommandEncoder();return h.copyTextureToBuffer({sourceTexture:s,width:1,height:e.length,destinationBuffer:u,byteOffset:0,bytesPerRow:8}),i.submit(h.finish()),am({device:i,inputs:{expression:{kind:"call",op:"multiply",args:[{kind:"input",name:"x"},{kind:"literal",value:[-1,1]}]},namedInputs:{x:new W({buffer:u,size:2,type:"float32",length:e.length})}},output:e,target:t})}finally{l.destroy(),Ee.recycle(u),o.destroy(),s.destroy()}},Uu=3e38,wC=({inputs:n,output:e,target:t})=>{const r=n.map((c,l)=>[`x${l}`,c]);TC(t.device.limits.maxVertexAttributes,r),EC(t.device.limits.maxInterStageShaderVariables,e);const i=r.map(([c,l])=>`in TYPE ${c}[${l.size}]`).join(", ");let s=0;const o=r.map(([c,l])=>{const u=Array.from({length:l.size},(d,h)=>`  result[${s+h}] = ${c}[${h}];`).join(`
`);return s+=l.size,u}).join(`
`),a=`void interleave(${i}, out TYPE result[RESULT_LEN]) {
${o}
}
`;return rt({module:{name:"interleave",vs:a},inputs:n,output:e,outputBuffer:t}),{success:!0}};function TC(n,e){const t=e.reduce((r,[,i])=>r+Math.ceil(i.size/4),0);if(t>n)throw new Error(`interleave() requires ${t} vertex attributes, exceeding device limit ${n}`)}function EC(n,e){if(e.size>n)throw new Error(`interleave() output size ${e.size} exceeds device inter-stage component limit ${n}`)}function AC(){const n=new Uint16Array([255]);return new Uint8Array(n.buffer)[0]>0}const RC=`#define LE ${AC()?1:0}
const uint F32_NAN = 0xffffffffu;
const uint F32_INF = 0x7f800000u;

// Find first set bit using binary search
// https://en.wikipedia.org/wiki/Find_first_set#CLZ
int countLeadingZeros(uint a) {
  if (a == 0u) return 32;
  int n = 0;
  if ((a & 0xffff0000u) == 0u) { n += 16; a = a << 16; }
  if ((a & 0xff000000u) == 0u) { n += 8;  a = a << 8;  }
  if ((a & 0xf0000000u) == 0u) { n += 4;  a = a << 4;  }
  if ((a & 0xc0000000u) == 0u) { n += 2;  a = a << 2;  }
  if ((a & 0x80000000u) == 0u) return n + 1;
  return n;
}

uint roundShiftRight(uint value, int shift) {
  if (shift <= 0) {
    return value << (-shift);
  }

  if (shift >= 32) {
    if (shift == 32 && value > 0x80000000u) {
      return 1u;
    }
    return 0u;
  }

  uint truncated = value >> shift;
  uint halfShift = 1u << (shift - 1);
  uint remainder = value & ((1u << shift) - 1u);
  if (remainder > halfShift || (remainder == halfShift && (truncated & 1u) == 1u)) {
    return truncated + 1u;
  }
  return truncated;
}

uint makeFloat_(uint sign, int exponent, uint mantissa) {
  return (sign << 31) | (uint(exponent + 127) << 23) | (mantissa & 0x7fffffu);
}

/**
 * Assemble a float32 in bit representation according to IEEE 754
 * https://en.wikipedia.org/wiki/Single-precision_floating-point_format
 */
uint makeFloat(uint sign, int exponent, uint significand) {
  if (significand == 0u) {
    return sign << 31;
  }

  // Remove any extra leading zeros for better precision
  int lead_zeros = countLeadingZeros(significand);
  // Significand is encoded as 1.fraction
  int normalizedExponent = exponent + 31 - lead_zeros;

  if (normalizedExponent > 127) {
    return (sign << 31) | F32_INF;
  }

  uint mantissa;
  if (normalizedExponent >= -126) {
    mantissa = roundShiftRight(significand, 8 - lead_zeros);
    if (mantissa >= 0x1000000u) {
      mantissa >>= 1;
      normalizedExponent++;
      if (normalizedExponent > 127) {
        return (sign << 31) | F32_INF;
      }
    }
    return makeFloat_(sign, normalizedExponent, mantissa);
  }

  int subnormalShift = -149 - exponent;
  mantissa = roundShiftRight(significand, subnormalShift);
  if (mantissa >= 0x800000u) {
    return (sign << 31) | (1u << 23);
  }
  return (sign << 31) | mantissa;
}

/**
 * Parse 8-byte memory as a float64 number according to IEEE 754
 * https://en.wikipedia.org/wiki/Double-precision_floating-point_format
 * Returns 8-byte memory as 2 float32 numbers, consisting of
 * high part: fround(d)
 * low part: d - fround(d)
 */
uvec2 parseAsDouble(uvec2 d) {
  #if LE
  d = d.yx; // to big endian
  #endif

  uint sign = (d[0] >> 31) & 1u; // first bit
  uint exponentBits = (d[0] >> 20) & 0x7ffu;
  int exponent = int(exponentBits) - 1023; // next 11 bits
  uint fractionHigh = d[0] & 0xfffffu;
  uint fractionLow = d[1];

  if (exponentBits == 0x7ffu) {
    if (fractionHigh == 0u && fractionLow == 0u) {
      return uvec2((sign << 31) | F32_INF, F32_NAN);
    }
    return uvec2(F32_NAN);
  }
  
  if (exponentBits == 0u) {
    // All float64 subnormals are too small to survive a float32 split.
    return uvec2(sign << 31);
  }

  if (exponent > 127) {
    return uvec2((sign << 31) | F32_INF, ((1u - sign) << 31) | F32_INF);
  }

  uint hi_part;
  uint low_part;

  // float64 significand has 52 bits
  // float32 significand has 23 bits
  // The significand of the high part is the significand of the double, trimmed
  uint f_hi = 0x800000u | (fractionHigh << 3) | (fractionLow >> 29);
  uint f_low = fractionLow & 0x1fffffffu;

  if (exponent < -126) {
    // For tiny normals, the top 24 significand bits still contribute to the float32
    // high part, but they land in the float32 subnormal range.
    hi_part = makeFloat(sign, exponent - 23, f_hi);

    // The residual keeps the remaining 29 significand bits at the original double scale.
    low_part = makeFloat(sign, exponent - 52, f_low);
    return uvec2(hi_part, low_part);
  }

  bool roundUp = f_low > 0x10000000u || (f_low == 0x10000000u && (f_hi & 1u) == 1u);

  uint f_rounded = f_hi + (roundUp ? 1u : 0u);
  int exponent_hi = exponent;
  if (f_rounded == 0x1000000u) {
    f_rounded = 0x800000u;
    exponent_hi++;
  }

  if (exponent_hi > 127) {
    // Overflows float32 limit
    hi_part = (sign << 31) | F32_INF;
    low_part = ((1u - sign) << 31) | F32_INF;
    return uvec2(hi_part, low_part);
  }
  
  hi_part = makeFloat_(sign, exponent_hi, f_rounded);

  int remainder = int(f_low);
  uint sign_low = sign;
  if (roundUp) {
    remainder -= 0x20000000;
  }
  if (remainder < 0) {
    sign_low = 1u - sign;
    remainder = -remainder;
  }
  low_part = makeFloat(sign_low, exponent - 52, uint(remainder));

  return uvec2(hi_part, low_part);
}

void fround(in uint x[X_LEN], out float result[X_LEN]) {
  int n = X_LEN / 2;
  for (int i = 0; i < n; i++) {
    uvec2 f = parseAsDouble(uvec2(x[i * 2], x[i * 2 + 1]));
    result[i] = uintBitsToFloat(f.x);
    result[i + n] = uintBitsToFloat(f.y);
  }
}
`,IC=({inputs:n,output:e,target:t})=>(rt({module:{name:"fround",vs:RC},inputs:n,output:e,operationType:"uint32",outputBuffer:t}),{success:!0});function cm(n,e,t){const r=mC(t),i=Le(e,1),s=Array.from({length:n.size},(o,a)=>`  v[${a}] = ${i}(texelFetch(source_values_texture, ivec2(${a}, rowIndex), 0).r);`).join(`
`);return{name:"source_values_texture",vs:`
uniform highp ${r} source_values_texture;
void read_source_values(int rowIndex, out TYPE v[${n.size}]) {
${s}
}
`}}function lm(n,e,t){const r=t.createTexture({width:Math.max(n.size,1),height:n.length,format:hC(e),usage:N.SAMPLE|N.COPY_DST});if(n.length===0)return r;const i=t.createCommandEncoder();return i.copyBufferToTexture({sourceBuffer:n.buffer,destinationTexture:r,byteOffset:n.offset,bytesPerRow:n.stride,rowsPerImage:n.length,size:[n.size,n.length,1]}),t.submit(i.finish()),r}const MC=async({inputs:n,output:e,target:t})=>{const{ids:r,sourceValues:i}=n,s=t.device,o=Xi("result",e.type,e.size),a=Le(r.type,1),c=Le(e.type,1),l=e.type,u=lm(i,l,s),d=`#version 300 es

void main() {
  INDEX_TYPE ids[1];
  get_ids(ids);
  TYPE result[${e.size}];
  gather(ids, result);
  set_result(result);
}
  `,h=new jt(s,{vs:d,defines:{INDEX_TYPE:a,TYPE:c,RESULT_LEN:e.size.toString(),SOURCE_VALUES_ROWS:i.length.toString()},modules:[LC(r,a),cm(i,e.type,l),PC(e.type),o],bindings:{source_values_texture:u},bufferLayout:[CC(r)],vertexCount:1,instanceCount:e.length,feedbackBufferMode:"interleaved",outputs:o.varyings});try{return h.run({inputBuffers:{ids:r.buffer},outputBuffers:{[o.varyings[0]]:t}}),{success:!0}}finally{h.destroy(),u.destroy()}};function LC(n,e){const t=Le(n.type,1);let r="aids_0";return n.type!==BC(e)&&(r=`${e}(${r})`),{name:"ids",vs:`
in ${t} aids_0;
void get_ids(out INDEX_TYPE v[1]) {
  v[0] = ${r};
}
`}}function CC(n){return{name:"ids",stepMode:n.isConstant?"vertex":"instance",byteStride:n.stride,attributes:[{attribute:"aids_0",format:im(n.type,1,n.normalized),byteOffset:n.offset}]}}function PC(n){return{name:"gather",vs:`
void zero_result(out TYPE result[RESULT_LEN]) {
  for (int i = 0; i < RESULT_LEN; i++) {
    result[i] = ${ji(n)};
  }
}

void gather(in INDEX_TYPE ids[1], out TYPE result[RESULT_LEN]) {
  int sourceIndex = int(ids[0]);
  if (sourceIndex < 0 || sourceIndex >= SOURCE_VALUES_ROWS) {
    zero_result(result);
    return;
  }
  read_source_values(sourceIndex, result);
}
`}}function BC(n){switch(n){case"uint":return"uint32";case"int":return"sint32";default:return"float32"}}const NC=`void row_dot(in TYPE x[X_LEN], in TYPE y[Y_LEN], out float result[1]) {
  float sum = 0.0;
  for (int i = 0; i < X_LEN; i++) {
    sum += float(x[i]) * float(y[i]);
  }
  result[0] = sum;
}
`,OC=({inputs:n,output:e,target:t})=>(rt({module:{name:"row_dot",vs:NC},inputs:n,output:e,operationType:"float32",outputBuffer:t}),{success:!0}),FC=`void equalAll(in TYPE x[X_LEN], in TYPE y[Y_LEN], out uint result[1]) {
  uint allEqual = uint(1);
  for (int i = 0; i < X_LEN; i++) {
    if (x[i] != y[i]) {
      allEqual = uint(0);
      break;
    }
  }
  result[0] = allEqual;
}
`,UC=({inputs:n,output:e,target:t})=>(rt({module:{name:"equalAll",vs:FC},inputs:n,output:e,operationType:e.type==="uint32"?n.x.type:e.type,outputBuffer:t}),{success:!0}),DC=`void row_length(in TYPE x[X_LEN], out float result[1]) {
  float sum = 0.0;
  for (int i = 0; i < X_LEN; i++) {
    sum += float(x[i]) * float(x[i]);
  }
  result[0] = sqrt(sum);
}
`,kC=({inputs:n,output:e,target:t})=>(rt({module:{name:"row_length",vs:DC},inputs:n,output:e,operationType:"float32",outputBuffer:t}),{success:!0}),$C=async({inputs:n,output:e,target:t})=>{const{segments:r}=n,i=t.device,s=Xi("result",e.type,e.size),o=r.type,a=lm(r,o,i),c=new jt(i,{vs:`#version 300 es

void main() {
  TYPE result[RESULT_LEN];
  segmentedMap(result);
  set_result(result);
}
`,defines:{TYPE:"uint",RESULT_LEN:e.size.toString(),SEGMENTS_LENGTH:r.length.toString()},modules:[cm(r,e.type,o),VC(),s],bindings:{source_values_texture:a},vertexCount:1,instanceCount:e.length,feedbackBufferMode:"interleaved",outputs:s.varyings});try{return c.run({outputBuffers:{[s.varyings[0]]:t}}),{success:!0}}finally{c.destroy(),a.destroy()}};function VC(){return{name:"segmentedMap",vs:`
uint read_segment_start(int segmentIndex) {
  TYPE value[1];
  read_source_values(segmentIndex, value);
  return uint(value[0]);
}

void segmentedMap(out TYPE result[RESULT_LEN]) {
  uint vertexIndex = uint(gl_InstanceID);
  int low = 0;
  int high = SEGMENTS_LENGTH;

  while (low < high) {
    int mid = low + (high - low) / 2;
    uint midStart = read_segment_start(mid);
    if (midStart <= vertexIndex) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  uint segmentIndex = uint(max(low - 1, 0));
  uint segmentStart = read_segment_start(int(segmentIndex));
  result[0] = segmentIndex;
  result[1] = vertexIndex - segmentStart;
}
`}}const GC=async({inputs:n,output:e,target:t})=>{const r=Le(e.type,1,e.normalized),i=ji(r);return rt({module:{name:"select",vs:""},inputs:n,output:e,operationType:e.type,outputBuffer:t,expression:s=>{const o=eo("condition",n.condition,s,i),a=eo("whenTrue",n.whenTrue,s,i),c=eo("whenFalse",n.whenFalse,s,i);return`(${o} != ${i} ? ${a} : ${c})`}}),{success:!0}};function eo(n,e,t,r){return t<e.size?`${n}[${t}]`:e.size===1?`${n}[0]`:r}const zC=({inputs:n,output:e,target:t})=>{const r=Xi("result",e.type,e.size),i=new jt(t.device,{vs:`#version 300 es

void main() {
  int result[1];
  result[0] = START + gl_InstanceID * STEP;
  set_result(result);
}
`,defines:{START:n.start.toString(),STEP:n.step.toString()},modules:[r],vertexCount:1,instanceCount:e.length,feedbackBufferMode:"interleaved",outputs:r.varyings});try{return i.run({outputBuffers:{[r.varyings[0]]:t}}),{success:!0}}finally{i.destroy()}},WC=({inputs:n,output:e,target:t})=>{const{columns:r}=n;return rt({module:{name:"swizzle",vs:"// swizzle expression handled inline"},expression:i=>`x[${r[i]}]`,inputs:{x:n.x},output:e,outputBuffer:t}),{success:!0}},HC=Object.freeze(Object.defineProperty({__proto__:null,arithmetic:am,dot:OC,equalAll:UC,extent:SC,fround:IC,gather:MC,interleave:wC,length:kC,segmentedMap:$C,select:GC,sequence:zC,swizzle:WC},Symbol.toStringTag,{value:"Module"}));export{iP as $,yP as A,Al as B,tP as C,aP as D,qC as E,xP as F,Y0 as G,N as H,Bg as I,F as J,SP as K,fP as L,$ as M,Cl as N,Eb as O,lP as P,Mf as Q,Ze as R,mt as S,cP as T,ou as U,Ge as V,Z2 as W,wP as X,TP as Y,W as Z,jt as _,uP as a,oi as a0,nP as a1,eP as a2,bv as a3,wr as a4,md as a5,ad as a6,Fr as a7,dv as a8,rP as a9,ld as aa,oA as ab,EP as ac,Ht as ad,ka as ae,Dx as af,Na as ag,Wo as ah,RP as ai,AP as aj,Re as ak,Jn as al,Mu as am,IP as an,sP as b,YC as c,Da as d,td as e,xd as f,lw as g,dP as h,Lv as i,Io as j,uw as k,Uo as l,sl as m,gP as n,pP as o,_P as p,mP as q,KC as r,fd as s,pd as t,hP as u,QC as v,bP as w,ZC as x,JC as y,vP as z};
//# sourceMappingURL=map-engine-CpEogxSp.js.map
