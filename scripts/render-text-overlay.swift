import AppKit
import Foundation

guard CommandLine.arguments.count >= 7 else {
  fputs("Usage: render-text-overlay output width height pointSize style text [fontFamily] [fontColor] [fontEffect]\n", stderr)
  exit(2)
}

let output = CommandLine.arguments[1]
let width = CGFloat(Double(CommandLine.arguments[2]) ?? 640)
let height = CGFloat(Double(CommandLine.arguments[3]) ?? 180)
let pointSize = CGFloat(Double(CommandLine.arguments[4]) ?? 48)
let style = CommandLine.arguments[5]
let text = CommandLine.arguments[6]
let fontFamily = CommandLine.arguments.count > 7 ? CommandLine.arguments[7] : "system"
let fontHex = CommandLine.arguments.count > 8 ? CommandLine.arguments[8] : "#FFFFFF"
let fontEffect = CommandLine.arguments.count > 9 ? CommandLine.arguments[9] : "outline"

func color(from hex: String) -> NSColor {
  let value = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
  guard value.count == 6, let rgb = UInt64(value, radix: 16) else { return .white }
  return NSColor(calibratedRed: CGFloat((rgb >> 16) & 255) / 255, green: CGFloat((rgb >> 8) & 255) / 255, blue: CGFloat(rgb & 255) / 255, alpha: 1)
}

func selectedFont(size: CGFloat, heavy: Bool) -> NSFont {
  let names = ["rounded":"Avenir Next", "condensed":"Avenir Next Condensed", "serif":"Georgia", "mono":"Menlo"]
  if let name = names[fontFamily], let font = NSFont(name: heavy ? "\(name) Bold" : name, size: size) ?? NSFont(name: name, size: size) { return font }
  return NSFont.systemFont(ofSize: size, weight: heavy ? .heavy : .semibold)
}
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
let textColor = color(from: fontHex)
shadow.shadowColor = fontEffect == "glow" ? textColor.withAlphaComponent(0.62) : NSColor.black.withAlphaComponent(0.9)
shadow.shadowBlurRadius = fontEffect == "glow" ? 5 : (style == "clean" ? 2 : 5)
shadow.shadowOffset = fontEffect == "glow" ? .zero : NSSize(width: 0, height: -2)
if fontEffect == "background" {
  NSColor.black.withAlphaComponent(0.72).setFill()
  NSBezierPath(roundedRect: NSRect(x: 2, y: 2, width: width - 4, height: height - 4), xRadius: 18, yRadius: 18).fill()
}
var attributes: [NSAttributedString.Key: Any] = [
  .font: selectedFont(size: pointSize, heavy: style != "clean"),
  .foregroundColor: textColor,
  .paragraphStyle: paragraph,
]
if fontEffect == "shadow" || fontEffect == "glow" { attributes[.shadow] = shadow }
if fontEffect == "outline" { attributes[.strokeColor] = NSColor.black; attributes[.strokeWidth] = style == "clean" ? -1 : -3 }
if fontEffect == "glow" { attributes[.strokeColor] = textColor; attributes[.strokeWidth] = -0.5 }
let attributed = NSAttributedString(string: text, attributes: attributes)
let textRect = NSRect(x: 8, y: 8, width: width - 16, height: height - 16)
attributed.draw(with: textRect, options: [.usesLineFragmentOrigin, .usesFontLeading])
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
  fputs("Unable to generate PNG\n", stderr)
  exit(1)
}
try png.write(to: URL(fileURLWithPath: output))
