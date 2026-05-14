export default function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){
  var t=localStorage.getItem('aia-theme')||'dark';
  if(t==='system'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  document.documentElement.dataset.theme=t;
  var fs=localStorage.getItem('aia-fontsize')||'md';
  document.documentElement.dataset.fontsize=fs;
  var d=localStorage.getItem('aia-density')||'default';
  document.documentElement.dataset.density=d;
})();`,
      }}
    />
  );
}
