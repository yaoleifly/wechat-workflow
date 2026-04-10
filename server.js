// Web UI 模式：npm run serve → http://localhost:3210
import express from "express";
import { runStep, STEPS, validateKey } from "./workflow.js";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const app = express();
app.use(express.json());

// API: 执行单步
app.post("/api/step", async (req, res) => {
  const { stepIdx, topic, prevResult, apiKey, provider = "claude", model } = req.body;
  if (!apiKey && !process.env.ANTHROPIC_API_KEY) {
    res.write(`data: ${JSON.stringify({ error: "请先填写 API Key" })}\n\n`);
    return res.end();
  }
  try {
    // 流式返回
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let full = "";
    const result = await runStep(stepIdx, topic, prevResult, (chunk) => {
      full += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }, { provider, model, apiKey });

    res.write(`data: ${JSON.stringify({ done: true, result })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// API: 验证 Key
app.post("/api/validate-key", async (req, res) => {
  const { provider, apiKey } = req.body;
  if (!apiKey) return res.json({ valid: false, error: "API Key 不能为空" });
  const result = await validateKey(provider, apiKey);
  res.json(result);
});

// API: 保存终稿
app.post("/api/save", (req, res) => {
  const { topic, content, allResults } = req.body;
  const outputDir = join(process.cwd(), "output");
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().slice(0, 10);
  const safeTitle = topic.replace(/[\/\\:*?"<>|]/g, "_").slice(0, 50);

  const finalPath = join(outputDir, `${timestamp}_${safeTitle}.md`);
  writeFileSync(finalPath, content, "utf-8");

  if (allResults) {
    const logPath = join(outputDir, `${timestamp}_${safeTitle}_全流程.md`);
    let log = `# 公众号创作记录\n\n选题：${topic}\n日期：${timestamp}\n\n---\n\n`;
    for (const [i, r] of Object.entries(allResults)) {
      log += `## Step ${parseInt(i) + 1}: ${STEPS[parseInt(i)]?.label}\n\n${r}\n\n---\n\n`;
    }
    writeFileSync(logPath, log, "utf-8");
  }

  res.json({ path: finalPath });
});

// 内嵌前端页面
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(HTML);
});

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>公众号创作工作台</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--fg:#1a1a1a;--fg2:#555;--fg3:#999;--bg:#fff;--bg2:#f7f6f3;--bg3:#eeedea;--border:#e2e0db;--accent:#d44a26;--accent-l:#fff0eb;--green:#1a7f4b;--green-l:#e8f5ee;--r:10px}
@media(prefers-color-scheme:dark){:root{--fg:#e5e5e5;--fg2:#aaa;--fg3:#777;--bg:#1a1a1a;--bg2:#222;--bg3:#2a2a2a;--border:#333;--accent:#e8633a;--accent-l:#2d1a12;--green:#2ecc71;--green-l:#1a2e1f}}
body{font-family:'Noto Sans SC','SF Pro Text',-apple-system,sans-serif;background:var(--bg2);color:var(--fg);min-height:100vh}
.container{max-width:820px;margin:0 auto;padding:2rem 1.5rem}
h1{font-size:24px;font-weight:700;letter-spacing:-0.5px}
.sub{font-size:14px;color:var(--fg3);margin-top:4px}
.input-row{display:flex;gap:10px;margin:28px 0}
input[type=text]{flex:1;padding:12px 16px;font-size:15px;border:1.5px solid var(--border);border-radius:var(--r);background:var(--bg);color:var(--fg);outline:none;transition:border .2s;font-family:inherit}
input:focus{border-color:var(--accent)}
.btn{padding:12px 24px;font-size:15px;font-weight:600;border:none;border-radius:var(--r);cursor:pointer;transition:all .15s;white-space:nowrap;font-family:inherit}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:disabled{background:var(--bg3);color:var(--fg3);cursor:default}
.btn-secondary{background:var(--bg3);color:var(--fg2)}
.btn:active{transform:scale(.98)}
.steps-bar{display:flex;flex-wrap:wrap;gap:6px;padding:14px 16px;background:var(--bg);border-radius:12px;border:1px solid var(--border);margin-bottom:24px}
.step-chip{padding:7px 13px;font-size:13px;border:1.5px solid transparent;border-radius:8px;cursor:default;transition:all .2s;display:flex;align-items:center;gap:5px;background:transparent;color:var(--fg3);font-family:inherit}
.step-chip.done{background:var(--green-l);color:var(--green);cursor:pointer}
.step-chip.active{background:var(--accent-l);color:var(--accent);animation:pulse 1.5s infinite}
.step-chip.viewing{border-color:var(--accent);font-weight:600}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.panel{background:var(--bg);border:1px solid var(--border);border-radius:14px;overflow:hidden}
.panel-header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--border);background:var(--bg2)}
.panel-title{font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px}
.panel-actions{display:flex;gap:6px}
.btn-sm{padding:5px 12px;font-size:12px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--fg2);cursor:pointer;font-family:inherit}
.btn-sm:hover{background:var(--bg2)}
.btn-sm.accent{border-color:var(--accent);background:var(--accent-l);color:var(--accent);font-weight:600}
.btn-sm.green{border-color:var(--green);background:var(--green-l);color:var(--green);font-weight:600}
.panel-body{padding:20px;font-size:14px;line-height:1.85;max-height:520px;overflow-y:auto;color:var(--fg)}
.panel-body h1,.panel-body h2,.panel-body h3{margin:18px 0 8px;font-weight:600;color:var(--fg)}
.panel-body h1{font-size:20px}.panel-body h2{font-size:17px}.panel-body h3{font-size:15px}
.panel-body strong{font-weight:600}
.panel-body code{background:var(--bg3);padding:2px 6px;border-radius:4px;font-size:13px}
.panel-body li{margin:3px 0;padding-left:4px}
.panel-body hr{border:none;border-top:1px solid var(--border);margin:20px 0}
.panel-body table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
.panel-body th,.panel-body td{border:1px solid var(--border);padding:8px 12px;text-align:left}
.panel-body th{background:var(--bg2);font-weight:600}
textarea.edit{width:100%;min-height:380px;padding:16px;font-size:14px;font-family:inherit;line-height:1.85;border:1px solid var(--border);border-radius:8px;background:var(--bg2);color:var(--fg);resize:vertical;outline:none}
.loading{text-align:center;padding:52px 20px;color:var(--fg3);font-size:15px}
.loading-icon{font-size:28px;margin-bottom:12px;animation:pulse 1.5s infinite}
.done-banner{margin-top:20px;padding:16px 20px;background:var(--green-l);border-radius:12px;display:flex;align-items:center;gap:12px;border:1px solid #b8e0c8}
.done-banner .title{font-weight:600;font-size:15px;color:var(--green)}
.done-banner .desc{font-size:13px;color:var(--fg3);margin-top:2px}
.saved-msg{margin-top:8px;font-size:13px;color:var(--green);padding:8px 0}
.model-cfg{margin:20px 0 0;display:flex;flex-direction:column;gap:8px}
.provider-tabs{display:flex;gap:6px}
.tab{padding:6px 16px;font-size:13px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg);color:var(--fg2);cursor:pointer;font-family:inherit;transition:all .15s}
.tab.active{background:var(--accent-l);border-color:var(--accent);color:var(--accent);font-weight:600}
.tab:disabled{opacity:.4;cursor:default}
.model-key-row{display:flex;gap:8px;align-items:center}
.model-sel{padding:9px 12px;font-size:13px;border:1.5px solid var(--border);border-radius:var(--r);background:var(--bg);color:var(--fg);font-family:inherit;outline:none;cursor:pointer}
.key-input{flex:1;padding:9px 14px;font-size:13px;border:1.5px solid var(--border);border-radius:var(--r);background:var(--bg);color:var(--fg);font-family:monospace;outline:none;transition:border .2s}
.key-input:focus{border-color:var(--accent)}
.btn-validate{padding:8px 16px;font-size:13px;font-weight:600;border:none;border-radius:var(--r);background:var(--accent);color:#fff;cursor:pointer;white-space:nowrap;font-family:inherit;transition:all .15s}
.btn-validate:disabled{background:var(--bg3);color:var(--fg3);cursor:default}
.key-status{font-size:12px;min-height:18px;margin-top:4px;padding-left:2px}
.key-status.valid{color:var(--green)}
.key-status.invalid{color:#e05252}
.key-status.validating{color:var(--fg3)}
.tip{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:var(--bg3);color:var(--fg3);font-size:11px;cursor:default;position:relative;border:1px solid var(--border);flex-shrink:0;user-select:none}
.tip::after{content:attr(data-tip);position:absolute;right:0;bottom:calc(100% + 8px);background:#1e1e1e;color:#f0f0f0;font-size:12px;padding:10px 14px;border-radius:8px;white-space:pre-line;width:250px;opacity:0;pointer-events:none;transition:opacity .2s;z-index:100;line-height:1.8;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.tip:hover::after{opacity:1}
</style>
</head>
<body>
<div class="container" id="app"></div>
<script>
const STEPS=[
  {id:1,label:"选题评估",icon:"🎯"},{id:2,label:"素材准备",icon:"📦"},
  {id:3,label:"结构搭建",icon:"🏗️"},{id:4,label:"写作起稿",icon:"✍️"},
  {id:5,label:"敏感审查",icon:"🛡️"},{id:6,label:"事实核查",icon:"🔍"},
  {id:7,label:"传播优化",icon:"📡"},{id:8,label:"标题生成",icon:"💡"},
  {id:9,label:"格式输出",icon:"📄"}
];

const PROVIDERS={
  claude:{label:"Claude ⭐",model:"claude-opus-4-6",keyPlaceholder:"Anthropic API Key (sk-ant-...)",tip:"如何获取 Claude API Key&#10;&#10;1. 访问 console.anthropic.com&#10;2. 注册并登录 Anthropic 账户&#10;3. 左侧菜单点击 API Keys&#10;4. 点击 Create Key 即可"},
  minimax:{label:"MiniMax",model:"MiniMax-Text-01",keyPlaceholder:"MiniMax API Key",tip:"如何获取 MiniMax API Key&#10;&#10;1. 访问 platform.minimaxi.com&#10;2. 注册并登录账户&#10;3. 右上角头像 → API 密钥&#10;4. 点击创建新密钥"},
  gemini:{label:"Gemini",model:"gemini-2.0-flash",keyPlaceholder:"Google AI API Key",tip:"如何获取 Gemini API Key&#10;&#10;1. 访问 aistudio.google.com&#10;2. 使用 Google 账号登录&#10;3. 左侧点击 Get API Key&#10;4. 点击 Create API key"}
};

const _k={claude:localStorage.getItem('wf_key_claude')||"",minimax:localStorage.getItem('wf_key_minimax')||"",gemini:localStorage.getItem('wf_key_gemini')||""};
let state={
  topic:"",provider:localStorage.getItem('wf_provider')||"claude",
  apiKeys:{claude:_k.claude,minimax:_k.minimax,gemini:_k.gemini},
  keyDraft:{claude:_k.claude,minimax:_k.minimax,gemini:_k.gemini},
  keyStatus:{claude:_k.claude?'valid':null,minimax:_k.minimax?'valid':null,gemini:_k.gemini?'valid':null},
  keyError:{claude:"",minimax:"",gemini:""},
  keyVisible:false,
  running:false,paused:false,currentStep:-1,results:{},activeView:0,editMode:false,editText:"",savedPath:""
};

function setState(patch){Object.assign(state,patch);render()}

function mdToHtml(md){
  return md
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>')
    .replace(/\\*(.+?)\\*/g,'<em>$1</em>')
    .replace(/\`(.+?)\`/g,'<code>$1</code>')
    .replace(/^- (.+)$/gm,'<li>$1</li>')
    .replace(/^\\d+\\. (.+)$/gm,'<li>$1</li>')
    .replace(/^---$/gm,'<hr>')
    .replace(/\\|(.+)\\|/gm,function(m){
      const cells=m.split('|').filter(c=>c.trim());
      if(cells.every(c=>/^[-:]+$/.test(c.trim())))return '';
      const tag=m.includes('---')?'td':'td';
      return '<tr>'+cells.map(c=>'<'+tag+'>'+c.trim()+'</'+tag+'>').join('')+'</tr>';
    })
    .replace(/(<tr>.*<\\/tr>\\n?)+/g,'<table>$&</table>')
    .replace(/\\n{2,}/g,'<div style="height:12px"></div>')
    .replace(/\\n/g,'<br>');
}

async function runStepSSE(stepIdx,topic,prevResult){
  const res=await fetch('/api/step',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({stepIdx,topic,prevResult,apiKey:state.apiKeys[state.provider],provider:state.provider})
  });
  const reader=res.body.getReader();
  const dec=new TextDecoder();
  let full="",buf="";
  while(true){
    const{done,value}=await reader.read();
    if(done)break;
    buf+=dec.decode(value,{stream:true});
    const lines=buf.split('\\n');
    buf=lines.pop()||"";
    for(const line of lines){
      if(!line.startsWith('data: '))continue;
      try{
        const d=JSON.parse(line.slice(6));
        if(d.error)throw new Error(d.error);
        if(d.chunk)full+=d.chunk;
        if(d.done)return d.result||full;
      }catch(e){if(e.message!=='Unexpected end of JSON input')throw e;}
    }
  }
  return full;
}

async function startWorkflow(){
  if(!state.topic.trim())return;
  setState({running:true,paused:false,results:{},activeView:0,currentStep:0,savedPath:""});
  let prev="";
  for(let i=0;i<9;i++){
    if(state.paused){setState({currentStep:i});return;}
    setState({currentStep:i,activeView:i});
    try{
      const result=await runStepSSE(i,state.topic,prev);
      prev=result;
      state.results[i]=result;
      setState({results:{...state.results}});
    }catch(e){
      state.results[i]="出错了："+e.message;
      setState({results:{...state.results},running:false});
      return;
    }
  }
  setState({currentStep:9,running:false});
}

async function saveToFile(){
  const content=state.results[8]||state.results[7]||"";
  const res=await fetch('/api/save',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({topic:state.topic,content,allResults:state.results})
  });
  const data=await res.json();
  setState({savedPath:data.path});
}

function render(){
  const s=state;
  const completed=s.currentStep===9;
  let h='';

  h+='<h1>📝 公众号创作工作台</h1>';
  h+='<p class="sub">输入选题，自动走完 9 步工作流（流式输出，本地保存）</p>';

  const prov=PROVIDERS[s.provider];
  h+='<div class="model-cfg">';
  h+='<div class="provider-tabs">';
  Object.entries(PROVIDERS).forEach(([id,p])=>{
    h+='<button class="tab'+(s.provider===id?' active':'')+'" '+(s.running?'disabled':'')+' onclick="setProvider(\\''+id+'\\')">' +p.label+'</button>';
  });
  h+='</div>';
  const kst=s.keyStatus[s.provider];
  const kdraft=s.keyDraft[s.provider];
  h+='<div class="model-key-row">';
  h+='<input type="'+(s.keyVisible?'text':'password')+'" class="key-input" value="'+esc(kdraft)+'" placeholder="'+prov.keyPlaceholder+'" '+(s.running?'disabled':'')+' oninput="onKeyInput(this.value)">';
  h+='<button class="btn-sm" onclick="setState({keyVisible:!state.keyVisible})">'+(s.keyVisible?'隐藏':'显示')+'</button>';
  h+='<button class="btn-validate" '+((s.running||kst==="validating"||!kdraft)?'disabled':'')+' onclick="validateAndSave()">'+(kst==="validating"?"验证中...":"验证并保存")+'</button>';
  h+='<span class="tip" data-tip="'+prov.tip+'">?</span>';
  h+='</div>';
  h+='<div class="key-status'+(kst?' '+kst:'')+'">';
  if(kst==="valid")h+="✓ 已验证保存";
  else if(kst==="invalid")h+="✗ "+(s.keyError[s.provider]||"Key 无效");
  else if(kst==="validating")h+="正在验证...";
  h+='</div>';
  h+='</div>';

  h+='<div class="input-row">';
  h+='<input type="text" id="topicInput" value="'+esc(s.topic)+'" placeholder="输入选题，如：用 Tailscale 搭一个随身 AI 工作台" '+(s.running?'disabled':'')+'>';
  if(!s.running&&!s.paused){
    h+='<button class="btn btn-primary" onclick="setState({topic:document.getElementById(\\'topicInput\\').value});startWorkflow()" '+(s.topic.trim()?'':'disabled')+'>'+(completed?'重新开始':'开始')+'</button>';
  }else if(s.running&&!s.paused){
    h+='<button class="btn btn-secondary" onclick="setState({paused:true})">暂停</button>';
  }else if(s.paused){
    h+='<button class="btn btn-primary" onclick="setState({paused:false});resumeFrom()">继续</button>';
  }
  h+='</div>';

  if(s.currentStep>=0){
    h+='<div class="steps-bar">';
    STEPS.forEach((st,i)=>{
      const isDone=s.results[i]!==undefined;
      const isActive=i===s.currentStep&&s.running&&!s.paused;
      const isViewing=i===s.activeView;
      let cls='step-chip';
      if(isDone)cls+=' done';
      if(isActive)cls+=' active';
      if(isViewing)cls+=' viewing';
      h+='<button class="'+cls+'" '+(isDone?'onclick="setState({activeView:'+i+',editMode:false})"':'')+'>';
      h+='<span style="font-size:12px">'+(isDone?'✓':st.icon)+'</span>';
      h+='<span>'+st.label+'</span></button>';
    });
    h+='</div>';

    if(s.results[s.activeView]!==undefined){
      const step=STEPS[s.activeView];
      h+='<div class="panel"><div class="panel-header">';
      h+='<div class="panel-title"><span>'+step.icon+'</span>Step '+(s.activeView+1)+': '+step.label+'</div>';
      h+='<div class="panel-actions">';
      if(!s.editMode){
        h+='<button class="btn-sm" onclick="setState({editMode:true,editText:state.results[state.activeView]})">编辑</button>';
      }else{
        h+='<button class="btn-sm green" onclick="saveEdit()">保存</button>';
        h+='<button class="btn-sm" onclick="setState({editMode:false})">取消</button>';
      }
      if(s.activeView===8&&!s.editMode){
        h+='<button class="btn-sm accent" onclick="copyFinal()">复制终稿</button>';
        h+='<button class="btn-sm green" onclick="saveToFile()">保存文件</button>';
      }
      h+='</div></div>';

      h+='<div class="panel-body">';
      if(s.editMode){
        h+='<textarea class="edit" id="editArea">'+esc(s.editText)+'</textarea>';
      }else{
        h+=mdToHtml(s.results[s.activeView]);
      }
      h+='</div></div>';
    }

    if(s.currentStep>=0&&s.running&&!s.results[s.currentStep]){
      const step=STEPS[s.currentStep];
      h+='<div class="loading"><div class="loading-icon">'+step.icon+'</div>';
      h+='正在执行 Step '+(s.currentStep+1)+': '+step.label+'...</div>';
    }

    if(completed){
      h+='<div class="done-banner"><span style="font-size:18px">✓</span><div>';
      h+='<div class="title">全流程完成</div>';
      h+='<div class="desc">点击各步骤查看结果，可编辑后复制终稿或保存文件</div>';
      h+='</div></div>';
    }

    if(s.savedPath){
      h+='<div class="saved-msg">✓ 已保存到 '+esc(s.savedPath)+'</div>';
    }
  }

  document.getElementById('app').innerHTML=h;

  // innerHTML 复用 DOM 时 value attribute 不覆盖 value property，需手动同步
  const ki=document.querySelector('.key-input');
  if(ki) ki.value=state.keyDraft[state.provider];

  const input=document.getElementById('topicInput');
  if(input){
    input.oninput=()=>state.topic=input.value;
    input.onkeydown=(e)=>{if(e.key==='Enter'&&!state.running){setState({topic:input.value});startWorkflow()}};
  }
}

function saveEdit(){
  const area=document.getElementById('editArea');
  if(area){state.results[state.activeView]=area.value;}
  setState({editMode:false});
}

function copyFinal(){
  const text=state.results[8]||state.results[7]||"";
  navigator.clipboard.writeText(text).then(()=>alert('已复制到剪贴板'));
}

function setProvider(p){localStorage.setItem('wf_provider',p);setState({provider:p,keyVisible:false});}
function onKeyInput(v){
  const p=state.provider;
  state.keyDraft[p]=v;
  if(state.keyStatus[p]!=='validating'){state.keyStatus[p]=null;state.keyError[p]='';}
  setState({});
}
async function validateAndSave(){
  const p=state.provider;
  const key=state.keyDraft[p];
  if(!key)return;
  state.keyStatus[p]='validating';
  setState({});
  try{
    const res=await fetch('/api/validate-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:p,apiKey:key})});
    const data=await res.json();
    if(data.valid){
      state.apiKeys[p]=key;
      localStorage.setItem('wf_key_'+p,key);
      state.keyStatus[p]='valid';
      state.keyError[p]='';
    }else{
      state.keyStatus[p]='invalid';
      state.keyError[p]=data.error||'Key 无效';
    }
  }catch(e){
    state.keyStatus[p]='invalid';
    state.keyError[p]=e.message;
  }
  setState({});
}

function esc(s){return (s||"").replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

async function resumeFrom(){
  let prev=state.results[state.currentStep-1]||"";
  for(let i=state.currentStep;i<9;i++){
    if(state.paused){setState({currentStep:i});return;}
    setState({currentStep:i,activeView:i,running:true});
    try{
      const result=await runStepSSE(i,state.topic,prev);
      prev=result;state.results[i]=result;
      setState({results:{...state.results}});
    }catch(e){
      state.results[i]="出错了："+e.message;
      setState({results:{...state.results},running:false});return;
    }
  }
  setState({currentStep:9,running:false});
}

render();
</script>
</body>
</html>`;

const PORT = process.env.PORT || 3210;
app.listen(PORT, () => {
  console.log();
  console.log("  📝 公众号创作工作台");
  console.log(`  🌐 http://localhost:${PORT}`);
  console.log();
});
