import Foundation
import ImageIO

func fail(_ message: String) -> Never {
  FileHandle.standardError.write(Data("\(message)\n".utf8))
  exit(1)
}

func integer(_ value: Any?) -> Int? {
  (value as? NSNumber)?.intValue
}

func number(_ value: Any?) -> Double? {
  (value as? NSNumber)?.doubleValue
}

let arguments = CommandLine.arguments
guard arguments.count == 2 else {
  fail("gif-inspect: invalid arguments")
}

let inputURL = URL(fileURLWithPath: arguments[1])
guard let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil) else {
  fail("gif-inspect: source failed")
}

let frameCount = CGImageSourceGetCount(source)
guard frameCount > 0 else {
  fail("gif-inspect: empty source")
}

guard
  let properties = CGImageSourceCopyProperties(source, nil) as? [CFString: Any],
  let gifProperties = properties[kCGImagePropertyGIFDictionary] as? [CFString: Any],
  let width = integer(gifProperties[kCGImagePropertyGIFCanvasPixelWidth])
    ?? integer(properties[kCGImagePropertyPixelWidth]),
  let height = integer(gifProperties[kCGImagePropertyGIFCanvasPixelHeight])
    ?? integer(properties[kCGImagePropertyPixelHeight]),
  let loopCount = integer(gifProperties[kCGImagePropertyGIFLoopCount])
else {
  fail("gif-inspect: metadata failed")
}

var duration = 0.0

for index in 0..<frameCount {
  guard
    CGImageSourceCreateImageAtIndex(source, index, nil) != nil,
    let frameProperties = CGImageSourceCopyPropertiesAtIndex(source, index, nil) as? [CFString: Any],
    integer(frameProperties[kCGImagePropertyPixelWidth]) == width,
    integer(frameProperties[kCGImagePropertyPixelHeight]) == height,
    let frameGIFProperties = frameProperties[kCGImagePropertyGIFDictionary] as? [CFString: Any],
    let delay = number(frameGIFProperties[kCGImagePropertyGIFUnclampedDelayTime])
      ?? number(frameGIFProperties[kCGImagePropertyGIFDelayTime]),
    delay > 0
  else {
    fail("gif-inspect: frame failed")
  }

  duration += delay
}

let metadata: [String: Any] = [
  "duration": duration,
  "frameCount": frameCount,
  "height": height,
  "loopCount": loopCount,
  "width": width,
]

guard
  let output = try? JSONSerialization.data(withJSONObject: metadata, options: [.sortedKeys]),
  let outputText = String(data: output, encoding: .utf8)
else {
  fail("gif-inspect: output failed")
}

FileHandle.standardOutput.write(Data("\(outputText)\n".utf8))
