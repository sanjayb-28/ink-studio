"""Portfolio illustrations of verified systems, not private product screenshots."""
from pathlib import Path
from html import escape
import math

ROOT = Path(__import__('os').environ.get('INK_PROJECT_ROOT', Path(__file__).resolve().parents[1])).expanduser().resolve() / 'assets/portfolio/projects'

def text(x, y, value, size=12, color='#aab3bf', anchor='start'):
    return f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}" text-anchor="{anchor}">{escape(value)}</text>'

def path(d, color='#626e7e', width=1.3, extra=''):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'

def node(x, y, w, title, subtitle, accent=False):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="62" rx="3" fill="#111b29" stroke="{"#cb5049" if accent else "#566273"}"/>'
            + text(x+12,y+25,title,14,'#dde1e6')+text(x+12,y+45,subtitle,9.5))

def arrow(d):
    return path(d, '#bd5952', 1.5, 'marker-end="url(#arrow)"')

def sheet(title, subtitle, body, filename):
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="810" viewBox="0 0 720 405">
    <defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#8394a9" stroke-opacity=".08" stroke-width=".7"/></pattern>
    <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3 0 6" fill="none" stroke="#bd5952" stroke-width="1"/></marker></defs>
    <rect width="720" height="405" fill="#0b1420"/><rect width="720" height="405" fill="url(#grid)"/>
    <g font-family="monospace">{text(32,42,title,21,'#e2e5e9')}{text(32,64,subtitle,10)}
    {path('M32 82H688','#788798',.8)}{body}</g></svg>'''
    (ROOT / filename).write_text(svg)

def rule4():
    body = text(33,109,'TENANT CONTEXT',9,'#8b97a7') + text(230,109,'CHECKPOINTED AGENT WORKFLOW',9,'#8b97a7')
    body += node(32,131,139,'Documents','S3 / SQS / ECS')
    body += node(32,228,139,'OpenSearch','hybrid / Titan',True)
    body += arrow('M102 194V224')
    body += node(230,131,134,'Retrieve','grounded context')
    body += node(410,131,134,'Draft','Claude / Bedrock',True)
    body += arrow('M171 258H195V162H226')+arrow('M364 162H406')
    body += node(410,249,134,'Validate','Pydantic / citations')
    body += node(590,249,98,'Review','human gate')
    body += arrow('M477 194V245')+arrow('M544 280H586')
    body += path('M297 194V339H638V311','#586777',1.1,'stroke-dasharray="3 4"')
    body += path('M477 311V339','#586777',1.1,'stroke-dasharray="3 4"')
    body += '<rect x="253" y="326" width="267" height="26" rx="2" fill="#142031" stroke="#657285"/>'
    body += text(386,344,'PostgreSQL · durable graph state',10,'#bac2cc','middle')
    body += text(32,380,'LANGGRAPH / LANGFUSE / TENANT-ISOLATED RAG',10,'#9eabbc')
    body += text(687,380,'01',10,'#c45a51','end')
    sheet('Rule4 / agent graph','MULTI-AGENT TICKET DRAFTING',body,'rule4-workflow-source.svg')

def bishop():
    body = '<rect x="32" y="106" width="360" height="244" rx="2" fill="#101c2a" stroke="#536173"/>'
    for i in range(6):
        x=58+i*57
        body += path(f'M{x} 108L{x+14} 170 {x-8} 235 {x+9} 348','#354659',9)
    for i in range(4):
        y=130+i*58
        body += path(f'M33 {y}L128 {y+12} 233 {y-7} 390 {y+4}','#354659',8)
    body += path('M88 310Q133 296 146 255T216 220T306 151','#b4c1cf',2,'stroke-dasharray="4 5"')
    body += '<circle cx="216" cy="220" r="49" fill="#c65049" fill-opacity=".06" stroke="#c65049" stroke-dasharray="3 5"/><circle cx="216" cy="220" r="18" fill="#c65049" fill-opacity=".15" stroke="#dc7266"/><circle cx="216" cy="220" r="5" fill="#eaa59b"/>'
    body += text(50,332,'background location',10,'#d2d8df')
    body += node(445,106,242,'Predict','hosted location model')
    body += node(445,198,242,'Context','weather / calendar / directions',True)
    body += node(445,290,242,'Notify','Expo push → mobile')
    body += arrow('M392 220H420V137H441')+arrow('M566 169V194')+arrow('M566 260V286')
    body += text(32,380,'REACT NATIVE / NESTJS / LOCATION INTELLIGENCE',10,'#9eabbc')
    sheet('Bishop / context engine','LOCATION → PREDICTION → RELEVANT NOTIFICATION',body,'bishop-architecture-source.svg')

def demucs():
    body = text(32,110,'MIX',10,'#bcc5d0')+text(538,110,'SEPARATED STEMS',10,'#bcc5d0')
    def wave(x,y,w,amplitude,seed,color):
        points=[]
        for n in range(w):
            envelope=.25+.75*math.sin(n*.045+seed)**2
            value=math.sin(n*.61+seed)*math.cos(n*.13+seed)*amplitude*envelope
            points.append(f'{"M" if not n else "L"}{x+n:.1f} {y+value:.1f}')
        return path(' '.join(points),color,1.2)
    body += wave(32,192,133,52,.7,'#b3c0ce')
    body += node(206,134,114,'REST API','Flask / MP3')
    body += node(206,236,114,'Redis','toWorker queue',True)
    body += arrow('M165 191H185V165H202')+arrow('M263 197V232')
    body += '<rect x="357" y="119" width="141" height="186" rx="3" fill="none" stroke="#78879b" stroke-dasharray="4 5"/>'
    body += text(427,139,'KUBERNETES',9,'#b8c2cd','middle')
    for i in range(3):
        body += f'<rect x="373" y="{151+i*43}" width="109" height="32" rx="2" fill="#162334" stroke="#647286"/>'
        body += text(427,172+i*43,'Demucs worker',10,'#d8dce3','middle')
    body += arrow('M320 267H341V212H369')
    for i,label in enumerate(['vocals','drums','bass','other']):
        y=143+i*47
        body += wave(546,y,137,15,1+i*.5,'#d07468' if i==0 else '#a1afc0')
        body += text(546,y+27,label,9)
    body += arrow('M499 212H523V143H542')
    body += path('M427 306V330H611V314','#768497',1.1)
    body += text(427,355,'MinIO / S3-compatible object storage',10,'#c0c8d2','middle')
    body += text(32,380,'QUEUED INFERENCE / CONTAINERIZED WORKERS / FOUR STEMS',10,'#9eabbc')
    sheet('Demucs / audio separation','DISTRIBUTED MUSIC-SEPARATION SERVICE',body,'demucs-architecture-source.svg')

if __name__ == '__main__':
    rule4(); bishop(); demucs()
