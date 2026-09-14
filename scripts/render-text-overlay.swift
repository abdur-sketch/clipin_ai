import AppKit
import Foundation

guard CommandLine.arguments.count >= 7 else {
  fputs("Usage: render-text-overlay output width height pointSize style text\n", stderr)
  exit(2)
}

let output = CommandLine.arguments[1]
let width = CGFloat(Double(CommandLine.arguments[2]) ?? 640)
let height = CGFloat(Double(CommandLine.arguments[3]) ?? 180)
let pointSize = CGFloat(Double(CommandLine.arguments[4]) ?? 48)
let style = CommandLine.arguments[5]
let text = CommandLine.arguments[6]
guard let bitmap = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: Int(width),
  pixelsHigh: Int(height),
  bitsPerSample: 8,
  samplesPerPixel: 4,
  hasAlpha: true,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: 0,
  bitsPerPixel: 0
) else {
  fputs("Unable to create bitmap\n", stderr)
  exit(1)
}
bitmap.size = NSSize(width: width, height: height)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
NSColor.clear.setFill()
NSRect(x: 0, y: 0, width: width, height: height).fill()

let paragraph = NSMutableParagraphStyle()
paragraph.alignment = .center
paragraph.lineBreakMode = .byWordWrapping
let shadow = NSShadow()
shadow.shadowColor = NSColor.black.withAlphaComponent(0.9)
shadow.shadowBlurRadius = style == "clean" ? 2 : 5
shadow.shadowOffset = NSSize(width: 0, height: -2)
let color = style == "karaoke" ? NSColor(calibratedRed: 0.78, green: 1, blue: 0.21, alpha: 1) : NSColor.white
let attributes: [NSAttributedString.Key: Any] = [
  .font: NSFont.systemFont(ofSize: pointSize, weight: style == "clean" ? .semibold : .heavy),
  .foregroundColor: color,
  .paragraphStyle: paragraph,
  .shadow: shadow,
  .strokeColor: NSColor.black,
  .strokeWidth: style == "clean" ? -1 : -3,
]
let attributed = NSAttributedString(string: text, attributes: attributes)
let textRect = NSRect(x: 8, y: 8, width: width - 16, height: height - 16)
attributed.draw(with: textRect, options: [.usesLineFragmentOrigin, .usesFontLeading])
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
  fputs("Unable to generate PNG\n", stderr)
  exit(1)
}
try png.write(to: URL(fileURLWithPath: output))
