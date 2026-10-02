import {writeFile} from 'node:fs/promises';
import {PLATEAU} from '../src/plateau.js';
import {PHONE} from '../src/mockup.js';
const logo="m13.0729 17.6825a3.61 3.61 0 0 0 -1.7248 3.0365 3.5132 3.5132 0 0 0 2.1379 3.2223 8.394 8.394 0 0 1 -1.0948 2.2618c-.6816.9812-1.3943 1.9623-2.4787 1.9623s-1.3633-.63-2.613-.63c-1.2187 0-1.6525.6507-2.644.6507s-1.6834-.9089-2.4787-2.0243a9.7842 9.7842 0 0 1 -1.6628-5.2776c0-3.0984 2.014-4.7405 3.9969-4.7405 1.0535 0 1.9314.6919 2.5924.6919.63 0 1.6112-.7333 2.8092-.7333a3.7579 3.7579 0 0 1 3.1604 1.5802zm-3.7284-2.8918a3.5615 3.5615 0 0 0 .8469-2.22 1.5353 1.5353 0 0 0 -.031-.32 3.5686 3.5686 0 0 0 -2.3445 1.2084 3.4629 3.4629 0 0 0 -.8779 2.1585 1.419 1.419 0 0 0 .031.2892 1.19 1.19 0 0 0 .2169.0207 3.0935 3.0935 0 0 0 2.1586-1.1368z";
// Display approximations from Apple's product renders, not official RGB specs.
const colors={skyblue:['#E7F0F5','#CFDFE8','#DBE6EC','#A5B6C2'],spaceblack:['#393A3C','#242527','#454749','#7B7C80'],cloudwhite:['#F5F4F0','#E5E4DF','#EFEFEB','#B9BAB8'],lightgold:['#F4EFE5','#E6DDC9','#EEE5D7','#BEB092']};
for(const [id,[light,dark,plateau,metal]] of Object.entries(colors)){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="74.7mm" height="156.2mm" viewBox="0 0 74.7 156.2"><defs>
 <linearGradient id="body" x2=".9" y2="1"><stop stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
 <linearGradient id="rim"><stop stop-color="${metal}"/><stop offset=".25" stop-color="#F5F7F8"/><stop offset=".5" stop-color="${metal}"/><stop offset="1" stop-color="#646B71"/></linearGradient>
 <radialGradient id="lens"><stop stop-color="#283546"/><stop offset=".3" stop-color="#162533"/><stop offset=".55" stop-color="#17151F"/><stop offset="1" stop-color="#07090C"/></radialGradient>
 </defs><rect x=".25" y=".25" width="74.2" height="155.7" rx="12.5" fill="url(#rim)" stroke="${metal}" stroke-width=".5"/><rect x="1.15" y="1.15" width="72.4" height="153.9" rx="11.6" fill="url(#body)"/>
 <g transform="translate(${PHONE.plateauX} ${PHONE.plateauY})"><path d="${PLATEAU.outer}" transform="translate(0 .8)" fill="#000" opacity=".12"/><path d="${PLATEAU.outer}" fill="${plateau}" stroke="${light}" stroke-width=".3"/>
 <circle cx="11.5177669773" cy="11.7625406876" r="7.91" fill="url(#rim)"/><circle cx="11.5177669773" cy="11.7625406876" r="7.15" fill="#191B1D" stroke="#BAC1C4" stroke-width=".16"/><circle cx="11.5177669773" cy="11.7625406876" r="5.8" fill="url(#lens)"/><ellipse cx="10.7" cy="11.1" rx="1.4" ry="2.2" fill="#466184" opacity=".45"/><circle cx="12.2" cy="12.1" r=".65" fill="#847298" opacity=".35"/>
 <circle cx="46.5677669773" cy="11.7625406876" r="1.15" fill="#757C7F" stroke="${light}" stroke-width=".2"/><circle cx="53.6477669773" cy="11.7625406876" r="3.15" fill="#DFE3E2" stroke="${light}" stroke-width=".25"/><circle cx="53.6477669773" cy="11.7625406876" r="2.4" fill="#F7F4EC"/><circle cx="53.6477669773" cy="11.7625406876" r="1" fill="#F0E4CD"/>
 </g><path d="${logo}" transform="translate(30.35 59)" fill="${metal}" opacity=".52"/>
 </svg>`;
 await writeFile(new URL(`../assets/iphone-air/mockups/${id}-rear.svg`,import.meta.url),svg);
}
