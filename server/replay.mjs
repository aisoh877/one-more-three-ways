import {createApp} from './http.mjs';
import {loadReplay} from './replay-runtime.mjs';
const recording=await loadReplay();
const app=createApp(recording.manager,recording);
app.listen(4176,'127.0.0.1',()=>console.log('Saved API replay: http://127.0.0.1:4176 — no new API calls.'));
process.on('SIGINT',()=>app.close());
process.on('SIGTERM',()=>app.close());
