const { asyncHandler } = require('../middleware');
const Tesseract = require('tesseract.js');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');

/**
 * Extract text from uploaded image using OCR
 */
exports.extractTextFromImage = asyncHandler(async (req, res) => {
  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng tải lên một file ảnh'
    });
  }

  const startTime = Date.now();
  const imagePath = req.file.path;

  try {
    // Use Tesseract.js to extract text from image
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'vie+eng', // Vietnamese + English
      {
        logger: info => {
          // Optional: log progress
          if (info.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(info.progress * 100)}%`);
          }
        }
      }
    );

    const processingTime = Date.now() - startTime;

    // Clean up: delete uploaded file after processing
    try {
      await fs.unlink(imagePath);
    } catch (unlinkError) {
      console.error('Error deleting uploaded file:', unlinkError);
    }

    // Check if any text was extracted
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy text trong ảnh. Vui lòng thử ảnh khác có chứa văn bản rõ ràng hơn.'
      });
    }

    // Return extracted text
    return res.status(200).json({
      success: true,
      data: {
        text: text.trim(),
        processingTime
      }
    });

  } catch (error) {
    // Clean up file in case of error
    try {
      await fs.unlink(imagePath);
    } catch (unlinkError) {
      console.error('Error deleting uploaded file:', unlinkError);
    }

    console.error('OCR Error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xử lý ảnh. Vui lòng thử lại.'
    });
  }
});

/**
 * Extract text from uploaded document (PDF or DOCX)
 */
exports.extractTextFromDocument = asyncHandler(async (req, res) => {
  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng tải lên một file'
    });
  }

  const startTime = Date.now();
  const filePath = req.file.path;
  const fileExtension = path.extname(req.file.originalname).toLowerCase();

  try {
    let text = '';

    // Extract text based on file type
    if (fileExtension === '.pdf') {
      // Extract text from PDF
      const dataBuffer = await fs.readFile(filePath);
      console.log('PDF module type:', typeof pdf);
      console.log('PDF module:', pdf);
      const pdfParser = pdf.default || pdf;
      const data = await pdfParser(dataBuffer);
      text = data.text;
      
    } else if (fileExtension === '.docx' || fileExtension === '.doc') {
      // Extract text from DOCX
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
      
    } else {
      // Clean up file
      await fs.unlink(filePath);
      
      return res.status(400).json({
        success: false,
        message: 'Định dạng file không được hỗ trợ. Vui lòng tải lên file PDF hoặc DOCX.'
      });
    }

    const processingTime = Date.now() - startTime;

    // Clean up: delete uploaded file after processing
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      console.error('Error deleting uploaded file:', unlinkError);
    }

    // Check if any text was extracted
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy nội dung văn bản trong file. Vui lòng thử file khác.'
      });
    }

    // Return extracted text
    return res.status(200).json({
      success: true,
      data: {
        text: text.trim(),
        processingTime,
        fileType: fileExtension.substring(1).toUpperCase()
      }
    });

  } catch (error) {
    // Clean up file in case of error
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      console.error('Error deleting uploaded file:', unlinkError);
    }

    console.error('Document extraction error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xử lý file. Vui lòng thử lại hoặc chọn file khác.'
    });
  }
});
