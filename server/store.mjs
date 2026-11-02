import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
export class TaskStore {
  constructor(path) {
    if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
    this.db=new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, cache_key TEXT UNIQUE NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL);');
  }
  list(){return this.db.prepare('SELECT payload FROM tasks ORDER BY rowid').all().map(r=>JSON.parse(r.payload));}
  get(id){const row=this.db.prepare('SELECT payload FROM tasks WHERE id=?').get(id);return row?JSON.parse(row.payload):null;}
  byKey(key){const row=this.db.prepare('SELECT payload FROM tasks WHERE cache_key=?').get(key);return row?JSON.parse(row.payload):null;}
  insert(task){this.db.prepare('INSERT INTO tasks VALUES(?,?,?,?)').run(task.id,task.cacheKey,task.status,JSON.stringify(task));return task;}
  save(task){this.db.prepare('UPDATE tasks SET status=?,payload=? WHERE id=?').run(task.status,JSON.stringify(task),task.id);return task;}
  close(){this.db.close();}
}
