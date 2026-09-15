import AVFoundation
import Foundation
import Vision

guard CommandLine.arguments.count >= 5 else { print("0.5,0.5"); exit(0) }
let asset = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
let start = Double(CommandLine.arguments[2]) ?? 0
let end = Double(CommandLine.arguments[3]) ?? start + 1
let samples = max(1, Int(CommandLine.arguments[4]) ?? 5)
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceBefore = CMTime(seconds: 0.35, preferredTimescale: 600)
generator.requestedTimeToleranceAfter = CMTime(seconds: 0.35, preferredTimescale: 600)
var centers: [(Double, Double)] = []
for index in 0..<samples {
  let fraction = samples == 1 ? 0.5 : Double(index) / Double(samples - 1)
  let time = CMTime(seconds: start + (end - start) * fraction, preferredTimescale: 600)
  guard let image = try? generator.copyCGImage(at: time, actualTime: nil) else { continue }
  let request = VNDetectFaceRectanglesRequest()
  try? VNImageRequestHandler(cgImage: image).perform([request])
  guard let face = request.results?.max(by: { $0.boundingBox.width * $0.boundingBox.height < $1.boundingBox.width * $1.boundingBox.height }) else { continue }
  centers.append((Double(face.boundingBox.midX), 1 - Double(face.boundingBox.midY)))
}
if centers.isEmpty { print("0.5,0.5") }
else {
  let x = centers.map(\.0).reduce(0, +) / Double(centers.count)
  let y = centers.map(\.1).reduce(0, +) / Double(centers.count)
  print(String(format: "%.4f,%.4f", x, y))
}
