// Image responsive (chantier 2, docs/DESIGN-SYSTEM §7) : AVIF + WebP avec
// repli JPEG, trois largeurs (480/960/1440), dimensions explicites
// (anti-CLS), chargement différé par défaut -- sauf l'image de héros,
// visible sans défiler, qui doit charger en priorité (sinon elle devient
// elle-même la cause du retard de LCP qu'elle est censée habiller).
// Fichiers attendus sous apps/web/public/img/ : `${name}-${width}.${ext}`.
export function ResponsiveImage({ name, width, height, alt, lazy = true, className, style }) {
  const base = `/img/${name}`;
  const widths = [480, 960, 1440];
  const srcSet = (ext) => widths.map((w) => `${base}-${w}.${ext} ${w}w`).join(", ");

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet("avif")} sizes="(max-width: 640px) 480px, (max-width: 1200px) 960px, 1440px" />
      <source type="image/webp" srcSet={srcSet("webp")} sizes="(max-width: 640px) 480px, (max-width: 1200px) 960px, 1440px" />
      <img
        src={`${base}-960.jpg`}
        srcSet={srcSet("jpg")}
        sizes="(max-width: 640px) 480px, (max-width: 1200px) 960px, 1440px"
        width={width}
        height={height}
        alt={alt}
        loading={lazy ? "lazy" : "eager"}
        decoding={lazy ? "async" : "sync"}
        fetchPriority={lazy ? undefined : "high"}
        className={className}
        style={style}
      />
    </picture>
  );
}
