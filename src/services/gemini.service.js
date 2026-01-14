const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get the model - using gemini-2.0-flash (fast & free)
const getModel = () => {
  return genAI.getGenerativeModel({ 
    model: process.env.GEMINI_MODEL || 'gemini-flash-latest'
  });
};

// Call Gemini API
const callGemini = async (prompt) => {
  try {
    const model = getModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error('Invalid response from Gemini API');
    }

    return text;
  } catch (error) {
    console.error('Gemini API error:', error.message);
    throw new Error(
      `Gemini API error: ${error.message || 'Unknown error'}`
    );
  }
};

// Generate Summary
exports.generateSummary = async (text, summaryMode = 'key_points') => {
  let prompt = '';

  switch (summaryMode) {
    case 'key_points':
  prompt = `
Bạn là trợ lý AI tóm tắt nội dung chính.

NHIỆM VỤ: Trích xuất và tóm tắt ĐIỂM CHÍNH từ văn bản

Văn bản:
${text}

YÊU CẦU BẮT BUỘC:
✅ CHỈ giữ lại: Định nghĩa, khái niệm cốt lõi, công thức, quy luật, thông tin quan trọng
✅ LOẠI BỎ: Ví dụ dài dòng, câu chuyện phụ, chi tiết không cần thiết
✅ Trình bày: Gạch đầu dòng (• hoặc -) rõ ràng, dễ đọc
✅ Số lượng ý điều chỉnh theo độ dài:
   • Văn bản rất ngắn (<100 từ): 2-3 ý quan trọng nhất
   • Văn bản ngắn (100-300 từ): 4-5 ý chính
   • Văn bản trung bình (300-800 từ): 6-8 ý
   • Văn bản dài (>800 từ): 8-12 ý
✅ Mỗi ý: 1 câu súc tích, làm nổi bật keyword quan trọng
✅ Thứ tự ưu tiên: Đặt ý QUAN TRỌNG NHẤT lên đầu
✅ Bôi đậm (highlight) các từ khóa quan trọng bằng **từ khóa** trong mỗi ý
✅ Viết bằng TIẾNG VIỆT
✅ KHÔNG viết tiêu đề, mở bài, kết luận
✅ CHỈ TRẢ VỀ NỘI DUNG TÓM TẮT, KHÔNG đưa ra thông tin meta

Mục tiêu: Người đọc nắm được toàn bộ nội dung chính trong thời gian ngắn.
  `.trim();
  break;

      case 'easy_read':
        prompt = `
  Bạn là trợ lý tóm tắt dễ hiểu cho người mới học.

  NHIỆM VỤ: Tóm tắt nội dung sau bằng ngôn ngữ ĐƠN GIẢN và dễ nhớ

  Nội dung:
  ${text}

  YÊU CẦU BẮT BUỘC:
  ✅ Dùng ngôn ngữ hàng ngày, dễ hiểu; tránh từ chuyên môn không cần thiết
  ✅ Nếu có khái niệm khó, giải thích ngắn gọn và trực tiếp, tránh dài dòng
  ✅ Có thể trình bày dưới dạng đoạn ngắn HOẶC gạch đầu dòng ngắn (•)
  ✅ Độ dài điều chỉnh theo input:
     • Văn bản rất ngắn (<100 từ): 50-80 từ
     • Văn bản ngắn (100-300 từ): 80-150 từ
     • Văn bản trung bình (300-800 từ): 150-250 từ
     • Văn bản dài (>800 từ): 250-400 từ
  ✅ Thứ tự: Giải thích khái niệm QUAN TRỌNG NHẤT trước
  ✅ Bôi đậm (highlight) các từ khóa quan trọng bằng **từ khóa** khi phù hợp
  ✅ Viết bằng TIẾNG VIỆT
  ✅ KHÔNG viết tiêu đề, mở bài, kết luận
  ✅ CHỈ TRẢ VỀ NỘI DUNG TÓM TẮT, KHÔNG đưa ra thông tin meta

  Mục tiêu: Người mới đọc hiểu ngay và nắm được nội dung chính.
        `.trim();
        break;

    case 'bullet_list':
      prompt = `
Bạn là trợ lý tóm tắt chuyên trình bày gạch đầu dòng.

NHIỆM VỤ: Tóm tắt văn bản sau HOÀN TOÀN bằng gạch đầu dòng

Văn bản:
${text}

YÊU CẦU BỮT BUỘC:
✅ 100% gạch đầu dòng (-), TUYỆT ĐỐI không viết đoạn văn
✅ Mỗi dấu gạch: 1 ý duy nhất, 1 câu ngắn (tối đa 15 từ)
✅ Bôi đậm (highlight) những từ khóa quan trọng trong mỗi gạch bằng **từ khóa**
✅ Có thể có gạch phụ (  - ) cho chi tiết nhưng giữ tối thiểu
✅ Số lượng gạch điều chỉnh theo độ dài:
   • Văn bản rất ngắn (<100 từ): 3-4 gạch
   • Văn bản ngắn (100-300 từ): 5-7 gạch
   • Văn bản trung bình (300-800 từ): 8-12 gạch
   • Văn bản dài (>800 từ): 12-18 gạch
✅ Thứ tự: Gạch QUAN TRỌNG NHẤT đặt đầu tiên
✅ Trình bày rõ ràng, dễ đọc nhanh
✅ Phù hợp để ghi chép hoặc ôn nhanh
✅ Viết bằng TIẾNG VIỆT
✅ KHÔNG viết tiêu đề, mở bài
✅ CHỈ TRẢ VỀ NỘI DUNG TÓM TẮT, KHÔNG đưa ra bất kỳ thông tin meta nào (như tên mode, giá trị cấu hình, v.v.)

Format mẫu:
- Ý chính 1
- Ý chính 2
  - Chi tiết 2.1 (nếu cần)
- Ý chính 3
      `.trim();
      break;

    case 'ultra_short':
      prompt = `
Bạn là trợ lý tóm tắt CỰC NGẮN cho sinh viên đọc nhanh.

NHIỆM VỤ: Rút gọn văn bản sau xuống MỨC TỐI THIỂU

Văn bản:
${text}

YÊU CẦU BỮT BUỘC:
✅ CHỈ giữ ý cốt lõi NHẤT, loại bỏ tất cả thứ phụ
✅ Ưu tiên: Keywords, khái niệm quan trọng
✅ Số lượng điều chỉnh theo độ dài:
   • Văn bản rất ngắn (<100 từ): 2 ý cốt lõi
   • Văn bản ngắn-trung (100-500 từ): 3-4 ý
   • Văn bản dài (>500 từ): TỐI ĐA 5 ý
✅ Mỗi ý: CỰC NGẮN - 5-10 từ hoặc 1 câu ngắn
✅ Thứ tự: Ý CỐT LÕI NHẤT đặt đầu tiên
✅ Bôi đậm (highlight) từ khóa quan trọng trong mỗi ý bằng **từ khóa**
✅ Trình bày: Gạch đầu dòng (-)
✅ Phù hợp đọc trong 10 giây trước khi thi
✅ Viết bằng TIẾNG VIỆT
✅ KHÔNG viết tiêu đề, giải thích thêm

Mục tiêu: Ngắn gọn NHẤT có thể nhưng vẫn đủ ý.
      `.trim();
      break;

    default:
      // Fallback to key_points
      return exports.generateSummary(text, 'key_points');
  }

  return await callGemini(prompt);
};

// Generate Questions
exports.generateQuestions = async (text, questionType, count) => {
  let prompt = '';

  switch (questionType) {
    case 'mcq':
      prompt = `
Bạn là trợ lý AI tạo câu hỏi trắc nghiệm cho sinh viên Việt Nam.

NHIỆM VỤ: Tạo ${count} câu hỏi trắc nghiệm 4 đáp án từ nội dung sau

Nội dung:
${text}

YÊU CẦU BẮT BUỘC:
✅ Tạo ĐÚNG ${count} câu hỏi trắc nghiệm
✅ Mỗi câu có 4 đáp án (A, B, C, D)
✅ Câu hỏi tập trung vào: Định nghĩa, khái niệm, quy luật, công thức quan trọng
✅ Đáp án sai phải hợp lý, không quá dễ loại trừ
✅ Độ khó: Vừa phải, phù hợp ôn tập và thi cử
✅ Giải thích ngắn gọn (1-2 câu) tại sao đáp án đó đúng
✅ Viết bằng TIẾNG VIỆT
✅ Trả về ĐÚNG định dạng JSON array, KHÔNG thêm markdown hay text thừa

Format JSON BẮT BUỘC:
[
  {
    "question": "Câu hỏi ở đây?",
    "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    "answer": "A",
    "explanation": "Giải thích ngắn gọn"
  }
]
      `.trim();
      break;

    case 'short':
      prompt = `
Bạn là trợ lý AI tạo câu hỏi tự luận ngắn cho sinh viên Việt Nam.

NHIỆM VỤ: Tạo ${count} câu hỏi tự luận ngắn từ nội dung sau

Nội dung:
${text}

YÊU CẦU BẮT BUỘC:
✅ Tạo ĐÚNG ${count} câu hỏi tự luận
✅ Câu hỏi yêu cầu giải thích, phân tích hoặc so sánh
✅ Đáp án mẫu: Ngắn gọn (2-4 câu), súc tích, đầy đủ ý
✅ Tập trung vào khái niệm, nguyên lý, ứng dụng quan trọng
✅ Độ khó: Vừa phải, phù hợp ôn tập
✅ Giải thích bổ sung (nếu cần) để làm rõ đáp án
✅ Viết bằng TIẾNG VIỆT
✅ Trả về ĐÚNG định dạng JSON array, KHÔNG thêm markdown hay text thừa

Format JSON BẮT BUỘC:
[
  {
    "question": "Câu hỏi yêu cầu giải thích/phân tích?",
    "answer": "Đáp án mẫu ngắn gọn 2-4 câu",
    "explanation": "Gợi ý hoặc điểm cần nhấn mạnh"
  }
]
      `.trim();
      break;

    case 'true_false':
      prompt = `
Bạn là trợ lý AI tạo câu hỏi đúng/sai cho sinh viên Việt Nam.

NHIỆM VỤ: Tạo ${count} câu hỏi đúng/sai từ nội dung sau

Nội dung:
${text}

YÊU CẦU BẮT BUỘC:
✅ Tạo ĐÚNG ${count} câu hỏi dạng phát biểu (statement)
✅ Mỗi câu là một khẳng định rõ ràng, có thể đúng hoặc sai
✅ Cân bằng số câu đúng và sai (nếu có nhiều câu)
✅ Câu sai phải tinh tế, không quá rõ ràng
✅ Tập trung vào kiến thức quan trọng, dễ nhầm lẫn
✅ Giải thích ngắn (1-2 câu) tại sao đúng/sai
✅ Viết bằng TIẾNG VIỆT
✅ Trả về ĐÚNG định dạng JSON array, KHÔNG thêm markdown hay text thừa

Format JSON BẮT BUỘC:
[
  {
    "question": "Phát biểu khẳng định rõ ràng",
    "answer": "Đúng",
    "explanation": "Giải thích tại sao đúng/sai"
  }
]
      `.trim();
      break;

    case 'fill_blank':
      prompt = `
Bạn là trợ lý AI tạo câu hỏi điền vào chỗ trống cho sinh viên Việt Nam.

NHIỆM VỤ: Tạo ${count} câu hỏi điền chỗ trống từ nội dung sau

Nội dung:
${text}

YÊU CẦU BẮT BUỘC:
✅ Tạo ĐÚNG ${count} câu hỏi điền khuyết
✅ Dùng "______" hoặc "..." để đánh dấu chỗ trống
✅ Chỗ trống là từ khóa, khái niệm, số liệu quan trọng
✅ Câu hỏi phải có ngữ cảnh rõ ràng để suy luận đáp án
✅ Đáp án: Từ/cụm từ chính xác cần điền
✅ Tránh chỗ trống quá dễ hoặc quá khó đoán
✅ Giải thích ngắn (nếu cần) về đáp án
✅ Viết bằng TIẾNG VIỆT
✅ Trả về ĐÚNG định dạng JSON array, KHÔNG thêm markdown hay text thừa

Format JSON BẮT BUỘC:
[
  {
    "question": "Câu có chỗ trống ______ cần điền",
    "answer": "Từ khóa đúng",
    "explanation": "Giải thích bổ sung (nếu cần)"
  }
]
      `.trim();
      break;

    default:
      // Fallback to mcq
      return exports.generateQuestions(text, 'mcq', count);
  }

  const result = await callGemini(prompt);
  
  // Parse JSON from response
  try {
    // Remove markdown code blocks if present
    let jsonStr = result.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();
    
    const questions = JSON.parse(jsonStr);
    return Array.isArray(questions) ? questions : [];
  } catch (parseError) {
    console.error('Failed to parse questions JSON:', parseError);
    // Return as single text question if parsing fails
    return [{
      question: result,
      answer: 'Xem nội dung câu hỏi',
      explanation: ''
    }];
  }
};

// Generate Explanation
exports.generateExplanation = async (text, mode = 'easy', withExamples = true) => {
  let prompt = '';

  switch (mode) {
    case 'easy':
      prompt = `
Bạn là trợ lý AI giải thích kiến thức cho sinh viên Việt Nam.

NHIỆM VỤ: Giải thích ĐƠNGIẢN, dễ hiểu nhất

Nội dung cần giải thích:
${text}

YÊU CẦU BẮT BUỘC:
✅ Dùng ngôn ngữ hàng ngày, tránh thuật ngữ phức tạp
✅ Giải thích từng phần nhỏ, từ cơ bản đến nâng cao
✅ Nếu có thuật ngữ khó, giải thích ngay bằng từ đơn giản
${withExamples ? '✅ Thêm 1-2 ví dụ cụ thể, dễ hình dung' : '✅ Không cần ví dụ, giải thích ngắn gọn'}
✅ Độ dài: 150-300 từ (tùy độ phức tạp của nội dung)
✅ Kết thúc bằng 1 câu tóm tắt ngắn để nhớ lâu
✅ Viết bằng TIẾNG VIỆT
✅ KHÔNG viết tiêu đề hay mở bài

Mục tiêu: Người mới học đọc xong hiểu ngay.
      `.trim();
      break;

    case 'exam':
      prompt = `
Bạn là trợ lý AI giải thích kiến thức hướng thi cho sinh viên Việt Nam.

NHIỆM VỤ: Giải thích TẬP TRUNG vào điểm quan trọng cho thi cử

Nội dung cần giải thích:
${text}

YÊU CẦU BẮT BUỘC:
✅ Tập trung vào: Định nghĩa, công thức, quy luật, đặc điểm quan trọng
✅ Làm nổi bật (bôi đậm **keyword**) các từ khóa, khái niệm cần nhớ
✅ Chỉ ra điểm hay nhầm lẫn, dễ sai trong bài thi
${withExamples ? '✅ Thêm ví dụ điển hình thường gặp trong đề thi' : '✅ Không cần ví dụ, tập trung lý thuyết'}
✅ Độ dài: 150-300 từ, súc tích, đi thẳng vào trọng tâm
✅ Kết thúc bằng gợi ý cách nhớ nhanh hoặc mẹo làm bài
✅ Viết bằng TIẾNG VIỆT
✅ KHÔNG viết tiêu đề hay mở bài

Mục tiêu: Sinh viên nắm được điểm cốt lõi để đạt điểm cao.
      `.trim();
      break;

    case 'friend':
      prompt = `
Bạn là trợ lý AI giải thích kiến thức như đang nói chuyện với bạn bè.

NHIỆM VỤ: Giải thích TỰ NHIÊN, gần gũi như nói chuyện

Nội dung cần giải thích:
${text}

YÊU CẦU BẮT BUỘC:
✅ Viết như đang trò chuyện, không formal
✅ Dùng từ ngữ thân thiện, có thể dùng "mình", "bạn"
✅ Giải thích dễ hiểu, có thể dùng so sánh đời thường
${withExamples ? '✅ Thêm ví dụ gần gũi, dễ liên tưởng trong cuộc sống' : '✅ Không cần ví dụ, giải thích trực tiếp'}
✅ Độ dài: 150-300 từ, thoải mái, tự nhiên
✅ Có thể dùng biểu cảm nhẹ nhàng để sinh động
✅ Viết bằng TIẾNG VIỆT
✅ KHÔNG viết tiêu đề hay mở bài

Mục tiêu: Đọc xong như vừa được bạn giải thích, dễ hiểu và thân thiện.
      `.trim();
      break;

    case 'deep_analysis':
      prompt = `
Bạn là trợ lý AI phân tích chuyên sâu kiến thức cho sinh viên và nhà nghiên cứu Việt Nam.

NHIỆM VỤ: Phân tích CHI TIẾT, đào sâu bản chất và mối liên hệ

Nội dung cần phân tích:
${text}

YÊU CẦU BẮT BUỘC:
✅ Phân tích từng khía cạnh: Định nghĩa, Bản chất, Nguyên lý hoạt động
✅ Chỉ ra mối liên hệ với các khái niệm/lý thuyết liên quan
✅ Phân tích ưu điểm, hạn chế, điều kiện áp dụng (nếu có)
✅ Làm rõ **tại sao** và **như thế nào**, không chỉ **là gì**
${withExamples ? '✅ Thêm ví dụ minh họa cụ thể, có phân tích kèm theo' : '✅ Không cần ví dụ, tập trung phân tích lý thuyết'}
✅ Độ dài: 300-500 từ, chi tiết nhưng không lan man
✅ Sử dụng thuật ngữ chuyên ngành chính xác, giải thích rõ khi cần
✅ Kết thúc bằng tổng kết hoặc góc nhìn tổng quan
✅ Viết bằng TIẾNG VIỆT
✅ KHÔNG viết tiêu đề hay mở bài

Mục tiêu: Hiểu sâu bản chất, nắm vững mối liên hệ, có tư duy phê phán.
      `.trim();
      break;

    default:
      // Fallback to easy
      return exports.generateExplanation(text, 'easy', withExamples);
  }

  return await callGemini(prompt);
};

// Rewrite Text
exports.rewriteText = async (text, style) => {
  let prompt = '';

  switch (style) {
    case 'simple':
      prompt = `
Bạn là trợ lý AI viết lại văn bản cho sinh viên Việt Nam.

NHIỆM VỤ: Viết lại văn bản đơn giản, dễ đọc, dễ hiểu

Nội dung gốc:
${text}

YÊU CẦU BẮT BUỘC:
✅ Giữ NGUYÊN ý nghĩa và nội dung chính của văn bản gốc
✅ Dùng từ ngữ đơn giản, dễ hiểu, tránh thuật ngữ phức tạp
✅ Câu văn ngắn gọn, rõ ràng, mạch lạc
✅ Cấu trúc logic, dễ theo dõi
✅ Độ dài tương đương văn bản gốc (±10%)
✅ Loại bỏ câu dài dòng, rườm rà
✅ Viết bằng TIẾNG VIỆT
✅ CHỈ trả về nội dung đã viết lại, KHÔNG thêm giải thích hay nhận xét

Mục tiêu: Người đọc hiểu ngay, không phải suy nghĩ nhiều.
      `.trim();
      break;

    case 'academic':
      prompt = `
Bạn là trợ lý AI viết lại văn bản học thuật cho sinh viên Việt Nam.

NHIỆM VỤ: Viết lại văn bản theo phong cách học thuật, formal, chuyên nghiệp

Nội dung gốc:
${text}

YÊU CẦU BẮT BUỘC:
✅ Giữ NGUYÊN ý nghĩa và nội dung chính của văn bản gốc
✅ Dùng văn phong formal, học thuật, chuyên nghiệp
✅ Sử dụng thuật ngữ chính xác, chuẩn khoa học
✅ Câu văn rõ ràng, có cấu trúc logic chặt chẽ
✅ Tránh ngôn ngữ thân mật, khẩu ngữ
✅ Độ dài tương đương văn bản gốc (±10%)
✅ Phù hợp cho bài luận, báo cáo, đề tài nghiên cứu
✅ Viết bằng TIẾNG VIỆT
✅ CHỈ trả về nội dung đã viết lại, KHÔNG thêm giải thích hay nhận xét

Mục tiêu: Văn bản chuyên nghiệp, phù hợp nộp bài học thuật.
      `.trim();
      break;

    case 'student':
      prompt = `
Bạn là trợ lý AI viết lại văn bản cho sinh viên Việt Nam.

NHIỆM VỤ: Viết lại văn bản tự nhiên như sinh viên viết, KHÔNG lộ AI

Nội dung gốc:
${text}

YÊU CẦU BẮT BUỘC:
✅ Giữ NGUYÊN ý nghĩa và nội dung chính của văn bản gốc
✅ Viết tự nhiên, không quá hoàn hảo hay máy móc
✅ Dùng từ ngữ sinh viên thường dùng, không quá cao siêu
✅ Câu văn đa dạng độ dài, có thể có lỗi nhỏ tự nhiên (nhưng vẫn đúng ngữ pháp)
✅ Tránh cấu trúc AI điển hình: liệt kê quá nhiều, câu mở đầu sáo rỗng
✅ Độ dài tương đương văn bản gốc (±10%)
✅ Phù hợp nộp bài tập, viết bài luận sinh viên
✅ Viết bằng TIẾNG VIỆT
✅ CHỈ trả về nội dung đã viết lại, KHÔNG thêm giải thích hay nhận xét

Mục tiêu: Đọc như sinh viên tự viết, không bị phát hiện AI.
      `.trim();
      break;

    case 'practical':
      prompt = `
Bạn là trợ lý AI viết lại văn bản hướng thực chiến cho sinh viên Việt Nam.

NHIỆM VỤ: Viết lại văn bản hướng hành động, áp dụng thực tế

Nội dung gốc:
${text}

YÊU CẦU BẮT BUỘC:
✅ Giữ NGUYÊN ý nghĩa và nội dung chính của văn bản gốc
✅ Tập trung vào các bước hành động cụ thể, khả thi
✅ Đưa ra ví dụ minh họa thực tế, dễ áp dụng
✅ Sử dụng ngôn ngữ rõ ràng, hướng dẫn từng bước
✅ Thêm tips/gợi ý thực hành nếu phù hợp
✅ Độ dài tương đương văn bản gốc (±15%)
✅ Phù hợp cho báo cáo thực hành, hướng dẫn áp dụng
✅ Viết bằng TIẾNG VIỆT
✅ CHỈ trả về nội dung đã viết lại, KHÔNG thêm giải thích hay nhận xét

Mục tiêu: Người đọc biết ngay cách làm và áp dụng được thực tế.
      `.trim();
      break;

    default:
      // Fallback to simple
      return exports.rewriteText(text, 'simple');
  }

  return await callGemini(prompt);
};
