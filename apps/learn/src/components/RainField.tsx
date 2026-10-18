// Same falling-Linux-command rain as Preloader.tsx (see that file's
// comments for the full design reasoning), reused here as a persistent
// background behind auth forms (login/register/forgot-password/reset-
// password/verify-email) instead of a one-time overlay — no hide-on-load
// logic, no shield, no terminal line, just the rain field itself sitting
// behind the page content. Duplicated rather than imported from
// Preloader.tsx since that component couples the rain tightly to its own
// shield/terminal/hide-on-load lifecycle; this is a plain, inert backdrop.
const RAIN_COMMANDS = [
  'ls -la', 'pwd', 'whoami', 'cd /var/log', 'mkdir project', 'cp file.txt backup/',
  'rm -rf tmp/', 'touch notes.txt', 'cat README.md', 'history | tail',
  'chmod 755 scan.sh', 'chown root:root key.pem', 'ps aux | grep nginx', 'df -h',
  'du -sh *', 'grep -r "error" /var/log', 'tar -xzvf archive.tar.gz', 'ssh user@10.0.0.5',
  'scp report.pdf host:/tmp', 'kill -9 1337', 'sudo systemctl restart nginx',
  'iptables -L -n -v', 'nmap -sV -p- 10.0.0.1', 'netstat -tulpn', "awk '{print $1}' access.log",
  'find / -perm -4000 2>/dev/null', 'openssl req -x509 -newkey rsa:4096',
  'journalctl -u sshd --since today', 'tcpdump -i eth0 port 443',
] as const;
const RAIN_POSITIONS = [
  { left: 2.4, dur: 5.39, delay: -5.13 }, { left: 9.1, dur: 3.52, delay: -1.51 },
  { left: 16.4, dur: 4.86, delay: -1.44 }, { left: 23.5, dur: 5.93, delay: -3.73 },
  { left: 30.9, dur: 3.51, delay: -5.25 }, { left: 38.0, dur: 5.89, delay: -4.52 },
  { left: 44.9, dur: 3.9, delay: -5.13 }, { left: 51.7, dur: 4.97, delay: -2.69 },
  { left: 58.4, dur: 4.1, delay: -0.88 }, { left: 64.0, dur: 6.45, delay: -4.21 },
  { left: 70.4, dur: 3.47, delay: -4.13 }, { left: 77.3, dur: 3.71, delay: -3.23 },
  { left: 84.3, dur: 5.12, delay: -2.5 }, { left: 3.1, dur: 3.82, delay: -1.57 },
  { left: 11.4, dur: 3.26, delay: -3.98 }, { left: 18.4, dur: 5.52, delay: -5.61 },
  { left: 25.3, dur: 5.82, delay: -5.06 }, { left: 33.9, dur: 4.45, delay: -5.24 },
  { left: 40.6, dur: 3.71, delay: -5.15 }, { left: 47.5, dur: 3.48, delay: -5.83 },
  { left: 54.4, dur: 3.74, delay: -3.78 }, { left: 61.1, dur: 4.26, delay: -4.42 },
  { left: 68.1, dur: 3.58, delay: -4.17 }, { left: 74.2, dur: 3.24, delay: -3.93 },
  { left: 81.6, dur: 3.14, delay: -2.75 }, { left: 88.3, dur: 3.01, delay: -5.99 },
  { left: 5.6, dur: 3.94, delay: -3.66 }, { left: 94.9, dur: 4.28, delay: -5.04 },
] as const;
const RAIN = RAIN_POSITIONS.map((pos, i) => {
  const text = RAIN_COMMANDS[i % RAIN_COMMANDS.length] ?? '';
  return { ...pos, text, chars: text.length, variant: i % 2 === 0 ? 'a' : 'b' };
});

export default function RainField() {
  return (
    <div className="rain-field" aria-hidden="true">
      {RAIN.map((item, i) => (
        <div
          key={i}
          className={`preloader-rain-cmd preloader-rain-cmd-${item.variant}`}
          style={{ left: `${item.left}%`, '--dur': `${item.dur}s`, '--delay': `${item.delay}s`, '--chars': `${item.chars}ch` } as React.CSSProperties}
        >
          <span className="preloader-rain-cmd-text font-mono">{item.text}</span>
        </div>
      ))}
    </div>
  );
}
