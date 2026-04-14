import { cn } from '@/lib/utils'

const BRAND_LOGO_PATH = '/branding/logo.svg'

export default function BrandLogo({
  className,
  imageClassName,
  compact = false,
  showSubtitle = false,
}) {
  return (
    <div className={cn('flex items-center', className)}>
      <img
        src={BRAND_LOGO_PATH}
        alt="CalmCompass logo"
        loading="eager"
        decoding="async"
        className={cn(
          'block shrink-0 object-contain [filter:drop-shadow(0_1px_1px_rgba(255,255,255,0.82))_drop-shadow(0_8px_20px_rgba(0,32,85,0.08))]',
          compact
            ? 'h-[2.6rem] w-[3.2rem] sm:h-[2.8rem] sm:w-[3.45rem]'
            : 'h-[4rem] w-[4.95rem] sm:h-[4.35rem] sm:w-[5.35rem] lg:h-[4.7rem] lg:w-[5.8rem]',
          imageClassName
        )}
      />

      {showSubtitle ? (
        <span className="sr-only">Dementia Care Companion</span>
      ) : null}
    </div>
  )
}
