// The same self-contained SVG subset is checked in the browser and on the server.
const TAGS = new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','title','desc','defs','linearGradient','radialGradient','stop','filter','feGaussianBlur','feOffset','feComposite','feFlood','feMerge','feMergeNode']);
const ATTRS = new Set(['xmlns','width','height','viewBox','preserveAspectRatio','role','aria-label','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','fill-rule','clip-rule','opacity','fill-opacity','stroke-opacity','transform','d','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','points','id','aria-labelledby','gradientUnits','gradientTransform','fx','fy','offset','stop-color','stop-opacity','filter','color-interpolation-filters','in','in2','stdDeviation','result','dx','dy','operator','k1','k2','k3','k4','flood-color','flood-opacity']);
export function importSVG(source, xml = globalThis) {
  if(typeof source!=='string' || source.length>200000) throw new Error('SVG 必须小于 200 KB');
  if(/<!DOCTYPE|<!ENTITY|<\?/i.test(source.replace(/^\s*<\?xml[^?]*\?>/,''))) throw new Error('SVG 不支持 XML 指令或外部实体');
  const parsed=new xml.DOMParser({onError:()=>{throw new Error('SVG XML 格式无效');}}).parseFromString(source,'image/svg+xml');
  const root=parsed.documentElement;
  if(root?.localName!=='svg' || parsed.getElementsByTagName('parsererror').length) throw new Error('无效的 SVG 文件');
  let count=0;const ids=new Map(),refs=[];
  function check(node){
    if(node.nodeType===1){
      if(++count>1000) throw new Error('SVG 节点过多');
      if(!TAGS.has(node.nodeName) || node.namespaceURI!=='http://www.w3.org/2000/svg') throw new Error(`不支持 SVG 元素 ${node.nodeName}；请导入纯路径矢量`);
      if(node.hasAttribute('id')){const id=node.getAttribute('id');if(!/^[A-Za-z_][\w.-]{0,79}$/.test(id)||ids.has(id))throw new Error('SVG ID 无效或重复');ids.set(id,node.localName);}
      for(let i=0;i<node.attributes.length;i++){
        const a=node.attributes.item(i);
        if(!ATTRS.has(a.name) || /javascript:|data:|[<>]/i.test(a.value)) throw new Error(`不支持 SVG 属性 ${a.name}；不接受样式、脚本或外部资源`);
        if(a.name==='xmlns' && a.value!=='http://www.w3.org/2000/svg') throw new Error('SVG 命名空间无效');
        if(/url\s*\(/i.test(a.value)){
          const ref=/^url\(#([A-Za-z_][\w.-]{0,79})\)$/.exec(a.value);
          if(!ref||!['fill','stroke','filter'].includes(a.name))throw new Error('SVG 只支持内部渐变与滤镜引用');
          refs.push([a.name,ref[1]]);continue;
        }
        if(a.name==='filter' && a.value!=='none')throw new Error('SVG 滤镜须为内部引用');
        if(['fill','stroke','stop-color','flood-color'].includes(a.name) && !/^(none|#[\da-f]{3}|#[\da-f]{6}|[a-z]+|rgb\([\d.,%\s]+\))$/i.test(a.value)) throw new Error('请将 SVG 颜色转为纯色');
      }
    }else if(![3,8].includes(node.nodeType)) throw new Error('SVG 包含不支持的节点');
    for(let child=node.firstChild;child;child=child.nextSibling)check(child);
  }
  check(root);
  for(const [kind,id] of refs){if(!ids.has(id)||(kind==='filter'?ids.get(id)!=='filter':!['linearGradient','radialGradient'].includes(ids.get(id))))throw new Error('SVG 渐变或滤镜引用无效');}
  let vb=root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  if(!vb || vb.length!==4){
    const length=v=>/^\d+(\.\d+)?(px)?$/.test(v||'')?parseFloat(v):NaN;
    vb=[0,0,length(root.getAttribute('width')),length(root.getAttribute('height'))];
  }
  if(vb.length!==4 || !vb.every(Number.isFinite) || vb[2]<=0 || vb[3]<=0 || vb.some(v=>Math.abs(v)>100000)) throw new Error('SVG 需要有效的 viewBox 或像素宽高');
  root.setAttribute('viewBox',vb.join(' '));root.setAttribute('width',String(vb[2]));root.setAttribute('height',String(vb[3]));
  root.setAttribute('preserveAspectRatio','xMidYMid meet');root.removeAttribute('x');root.removeAttribute('y');
  return {svg:new xml.XMLSerializer().serializeToString(root),ratio:vb[3]/vb[2]};
}
