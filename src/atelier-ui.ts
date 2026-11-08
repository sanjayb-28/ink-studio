import {icon,githubIcon} from './atelier-icons';
const arrow = icon('arrow-right');
const northeast = icon('arrow-up-right');
const github = githubIcon;
export const frame = '<svg class="at-frame" viewBox="0 0 160 44" preserveAspectRatio="none" fill="none" aria-hidden="true">' +
  ['M1 5 Q80 5.7 159 5', 'M155 1 Q155 20 155 39', 'M159 35 Q80 34.7 1 35', 'M5 39 Q5 20 5 1']
    .map((d,i) => '<path class="at-frame-base" d="'+d+'"/><path class="at-frame-trace" pathLength="1" style="--edge:'+i+'" d="'+d+'"/>').join('') +
  '</svg>';
export const wash = '<span class="at-wash" aria-hidden="true"><svg class="at-wash-art" viewBox="0 0 160 40" preserveAspectRatio="none"><path class="at-wash-surface"/><path class="at-wash-fill"/></svg></span>';
const leading: Record<string,string> = {contact:'mail',github:'github',work:'briefcase',elements:'pen-line',replay:'play'};
export const button = (label:string, action:string, variant='outline') => {
  const mark = leading[action];
  const glyph = mark === 'github' ? github : mark ? icon(mark) : '';
  return '<button class="at-button at-button--'+variant+'" data-at-action="'+action+'">'+wash+frame+
    (glyph ? '<span class="at-leading-icon">'+glyph+'</span>' : '')+'<span class="at-button-label">'+label+'</span><span class="at-trailing-icon">'+
    (action==='github'?icon('arrow-down'):arrow)+'</span></button>';
};
export const sectionHeading = (n:string,title:string,extra='') => '<div class="at-section-heading"><h2><span>'+n+'</span> '+title+'</h2>'+extra+'</div>';
