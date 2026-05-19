import { createServer } from 'net';
import { spawn } from 'child_process';

const findPort = (start = 3000) =>
  new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(start, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', (err) => {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        resolve(findPort(start + 1));
      } else {
        reject(err);
      }
    });
  });

const mode = process.argv[2] || 'dev';
const basePort = parseInt(process.env.PORT, 10) || 3000;

findPort(basePort).then((port) => {
  if (port !== basePort) {
    console.log(`Port ${basePort} unavailable, using ${port}`);
  }
  const args = mode === 'start' ? ['start', '-p', String(port)] : ['dev', '-p', String(port)];
  const child = spawn('next', args, { stdio: 'inherit', shell: true });
  child.on('exit', (code) => process.exit(code));
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
