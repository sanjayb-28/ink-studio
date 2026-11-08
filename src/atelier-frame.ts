/** Four separate pen strokes, joined as beams and posts, in physical CSS pixels. */
export function frameGeometry(width:number,height:number,seed:number) {
  const j=(i:number)=>Math.sin(seed*1.17+i*2.31)*.12;
  const l=5+j(1),r=width-5+j(2),t=5+j(3),b=height-5+j(4);
  const bend=Math.min(.7,width*.003);
  const paths=[
    `M.7 ${t-.45} Q${width*.5} ${t+bend} ${width-.7} ${t-.35}`,
    `M${r+.15} .8 Q${r-.22} ${height*.5} ${r-.35} ${height-.8}`,
    `M${width-.7} ${b+.3} Q${width*.5} ${b-.25} .7 ${b+.15}`,
    `M${l-.2} ${height-.8} Q${l+.2} ${height*.5} ${l-.1} .8`,
  ];
  // Pigment stays inside the structural joins; no disconnected brush fragments.
  const surface=`M${l} ${t} Q${width*.5} ${t+bend*.5} ${r} ${t} L${r-.25} ${b} Q${width*.5} ${b-.15} ${l} ${b}Z`;
  return {paths,surface};
}
