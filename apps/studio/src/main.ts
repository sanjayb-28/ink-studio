import '@fontsource/geist/latin-400.css';
import '@fontsource/geist-mono/latin-400.css';
import '@sanjayb-28/ink-runtime/theme.css';
import './styles/app.css';
import './styles/components.css';
import { inkStudioMarkup, mountInkStudio } from './features/painting/index';
import { componentsMarkup, mountComponents } from './features/components/index';
import { imageLabMarkup, mountImageLab } from './features/images/index';
import { materialsMarkup, mountMaterials } from './features/materials/index';
const root = document.querySelector<HTMLDivElement>('#app')!,
  path = location.pathname.replace(/\/+$/, '') || '/';
document.body.classList.add('ink-ui-active');
let cleanup: (() => void) | undefined;
if (path === '/components') {
  root.dataset.page = 'components';
  root.innerHTML = componentsMarkup();
  cleanup = mountComponents(root);
} else if (path === '/image-lab') {
  root.dataset.page = 'image-lab';
  root.innerHTML = imageLabMarkup();
  cleanup = mountImageLab(root);
} else if (path === '/materials') {
  root.innerHTML = materialsMarkup();
  cleanup = mountMaterials(root);
} else if (path === '/') {
  root.innerHTML = inkStudioMarkup();
  cleanup = mountInkStudio(root);
} else {
  document.title = 'Page not found · Ink Studio';
  root.innerHTML =
    '<main class="is-main"><h1>Page not found</h1><a href="/">Open Ink Studio →</a></main>';
}
window.addEventListener('pagehide', () => cleanup?.(), { once: true });
