export function generationMetadata(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||input.version!==1||typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>4000||typeof input.transparentBackground!=='boolean')throw new Error('生成信息须含 version 1、1–4000 字符 prompt 和 transparentBackground');
  for(const key of Object.keys(input))if(!['version','prompt','transparentBackground'].includes(key))throw new Error(`未知生成信息：${key}`);
  return {version:1,prompt:input.prompt.trim(),transparentBackground:input.transparentBackground};
}
export function generationRequest(prompt,{transparentBackground=true}={}){
  const metadata=generationMetadata({version:1,prompt,transparentBackground});
  return {kind:'template-plus-image-generation',...metadata,
    generationPrompt:metadata.prompt+(transparentBackground?'\nCreate a standalone sticker asset with a genuinely transparent background (alpha channel), no device mockup, no text or watermark. Leave a small transparent margin.':'\nCreate a standalone sticker asset, no device mockup, no text or watermark.'),
    output:{format:'png',maxBytes:5000000,maxDimension:8192,maxPixels:33554432},
    agent:{requires:'image-generation',fallback:'Report that image generation is unavailable; do not substitute a placeholder or claim generation succeeded.',
      next:'Use your native image generation tool. Save the result locally, then add it with sticker-cli.mjs add --file <image> --generation-request <request.json>. Run check, optionally avoid-logo, preview, then return the layout for human editing.'}};
}
export function readGenerationRequest(value){
  if(value?.kind!=='template-plus-image-generation'||value.version!==1||typeof value.transparentBackground!=='boolean')throw new Error('无效的文生图请求');
  // Rebuild instructions from validated fields; request files never supply commands.
  return generationRequest(value.prompt,{transparentBackground:value.transparentBackground});
}
