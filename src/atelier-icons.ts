import {
  createIcons, ArrowRight, ArrowDown, ArrowLeft, ArrowUpRight, ExternalLink,
  Mail, Copy, MessageSquare, Play, Pause, RotateCcw, PenLine, Check, X, Zap, Briefcase,
  CircleAlert, Save, ChevronRight, ChevronLeft, ChevronDown, ArrowUp, Plus, Minus, Menu, Download, FileText, Maximize2, LoaderCircle, Info, Search,
} from 'lucide';
import brands from './social-icons.json';

// Lucide interface glyphs and familiar brand silhouettes share one icon API.
const icons = {
  ArrowRight, ArrowDown, ArrowLeft, ArrowUpRight, ExternalLink, Mail, Copy, Pause,
  MessageSquare, Play, RotateCcw, PenLine, Check, X, Zap, Briefcase, CircleAlert, Save, ChevronRight, ChevronLeft, ChevronDown, ArrowUp, Plus, Minus, Menu, Download, FileText, Maximize2, LoaderCircle, Info, Search,
};
export const icon = (name: string) =>
  '<i data-at-icon="' + name + '" aria-hidden="true"></i>';
export const githubIcon = brands.GitHub;

export function mountAtelierIcons(root: HTMLElement) {
  createIcons({
    icons,
    nameAttr: 'data-at-icon',
    root,
    attrs: {class: 'at-icon', 'aria-hidden': 'true', 'stroke-width': 1.8},
  });
}
