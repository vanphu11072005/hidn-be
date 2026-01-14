const { AIRequest, History } = require('../repositories');
const { asyncHandler } = require('../middleware');
const { GeminiService, WalletService, ToolConfigService } = require('../services');
const geminiService = GeminiService;
const walletService = WalletService;
const toolConfigService = ToolConfigService;
const { v4: uuidv4 } = require('uuid');

// Helper to check cooldown
async function checkCooldown(userId, toolType) {
  const cooldownSeconds = await toolConfigService.getCooldownSeconds(toolType);
  
  if (cooldownSeconds <= 0) {
    return { allowed: true };
  }

  const lastRequestTime = await AIRequest.getLastRequestTime(userId, toolType);
  
  if (!lastRequestTime) {
    return { allowed: true };
  }

  const now = new Date();
  const elapsedSeconds = Math.floor((now - lastRequestTime) / 1000);
  
  if (elapsedSeconds < cooldownSeconds) {
    const remainingSeconds = cooldownSeconds - elapsedSeconds;
    return {
      allowed: false,
      remainingSeconds,
      message: `Vui lòng chờ ${remainingSeconds} giây trước khi sử dụng lại công cụ này`
    };
  }

  return { allowed: true };
}


// Helper to format output for history storage
const formatOutputForHistory = (toolType, result) => {
  switch (toolType) {
    case 'questions':
      // Format questions array into readable text
      if (Array.isArray(result)) {
        return result.map((q, index) => {
          let formatted = `Câu ${index + 1}: ${q.question}\n`;
          
          // If has options (MCQ), display them
          if (q.options && Array.isArray(q.options)) {
            q.options.forEach((opt, i) => {
              const letter = String.fromCharCode(65 + i); // A, B, C, D
              formatted += `  ${letter}. ${opt}\n`;
            });
          }
          
          // Show answer for all question types
          formatted += `  Đáp án: ${q.answer}\n`;
          
          if (q.explanation) {
            formatted += `  Giải thích: ${q.explanation}\n`;
          }
          
          return formatted;
        }).join('\n');
      }
      return JSON.stringify(result);
      
    case 'summary':
    case 'explain':
    case 'rewrite':
      // These are already plain text
      return result;
      
    default:
      return typeof result === 'string' 
        ? result 
        : JSON.stringify(result);
  }
};

// Generate AI Summary
exports.generateSummary = asyncHandler(async (req, res) => {
  const { text, summaryMode, focusOnExam } = req.body;
  const userId = req.user.id;
  const toolType = 'summary';

  // Backward compatibility: if focusOnExam is true and no summaryMode, default to key_points
  const mode = summaryMode || (focusOnExam ? 'key_points' : 'key_points');

  // Check if tool is enabled
  const isEnabled = await toolConfigService.isToolEnabled(toolType);
  if (!isEnabled) {
    return res.status(403).json({
      success: false,
      message: 'Công cụ này hiện đang tạm ngưng hoạt động'
    });
  }

  // Check cooldown
  const cooldownCheck = await checkCooldown(userId, toolType);
  if (!cooldownCheck.allowed) {
    return res.status(429).json({
      success: false,
      message: cooldownCheck.message,
      remainingSeconds: cooldownCheck.remainingSeconds
    });
  }

  // Get cost and check credits in one go
  const creditsUsed = await walletService.getCreditCost(toolType);
  const hasCredits = await walletService.hasEnoughCredits(userId, toolType);
  
  if (!hasCredits) {
    const wallet = await walletService.getWallet(userId);
    return res.status(402).json({
      success: false,
      message: 'Không đủ credits để thực hiện',
      required: creditsUsed,
      available: wallet.totalCredits
    });
  }

  // Create request log
  const requestId = uuidv4();
  const startTime = Date.now();
  
  await AIRequest.create({
    request_id: requestId,
    user_id: userId,
    tool_type: toolType,
    credits_used: creditsUsed,
    status: 'pending'
  });

  try {
    // Call Gemini API
    const result = await geminiService.generateSummary(text, mode);
    const processingTime = Date.now() - startTime;

    // Deduct credits
    const updatedWallet = await walletService.deductCredits(
      userId, 
      toolType
    );

    // Update request status
    await AIRequest.updateStatus(
      requestId, 
      'success', 
      processingTime
    );

    // Note: History is NOT auto-saved.
    // User must explicitly click "Save to History" button.

    res.json({
      success: true,
      data: {
        summary: result,
        creditsUsed,
        processingTime,
        remainingCredits: updatedWallet.totalCredits,
        requestId // Return requestId for manual save
      },
      result: {
        summary: result
      }
    });

  } catch (error) {
    await AIRequest.updateStatus(requestId, 'failed', 0);
    throw error;
  }
});

// Generate Questions
exports.generateQuestions = asyncHandler(async (req, res) => {
  const { text, questionType, count = 5 } = req.body;
  const userId = req.user.id;
  const toolType = 'questions';

  // Check if tool is enabled
  const isEnabled = await toolConfigService.isToolEnabled(toolType);
  if (!isEnabled) {
    return res.status(403).json({
      success: false,
      message: 'Công cụ này hiện đang tạm ngưng hoạt động'
    });
  }

  // Check cooldown
  const cooldownCheck = await checkCooldown(userId, toolType);
  if (!cooldownCheck.allowed) {
    return res.status(429).json({
      success: false,
      message: cooldownCheck.message,
      remainingSeconds: cooldownCheck.remainingSeconds
    });
  }

  // Get cost and check credits
  const creditsUsed = await walletService.getCreditCost(toolType);
  const hasCredits = await walletService.hasEnoughCredits(userId, toolType);
  
  if (!hasCredits) {
    const wallet = await walletService.getWallet(userId);
    return res.status(402).json({
      success: false,
      message: 'Không đủ credits để thực hiện',
      required: creditsUsed,
      available: wallet.totalCredits
    });
  }

  const requestId = uuidv4();
  const startTime = Date.now();
  
  await AIRequest.create({
    request_id: requestId,
    user_id: userId,
    tool_type: toolType,
    credits_used: creditsUsed,
    status: 'pending'
  });

  try {
    const result = await geminiService.generateQuestions(
      text, 
      questionType, 
      count
    );
    const processingTime = Date.now() - startTime;

    const updatedWallet = await walletService.deductCredits(
      userId, 
      toolType
    );
    
    await AIRequest.updateStatus(
      requestId, 
      'success', 
      processingTime
    );

    // Manual save only - user will save via /save-history endpoint

    res.json({
      success: true,
      data: {
        questions: result,
        creditsUsed,
        processingTime,
        remainingCredits: updatedWallet.totalCredits
      }
    });

  } catch (error) {
    await AIRequest.updateStatus(requestId, 'failed', 0);
    throw error;
  }
});

// Generate Explanation
exports.generateExplanation = asyncHandler(async (req, res) => {
  const { text, mode, withExamples = true } = req.body;
  const userId = req.user.id;
  const toolType = 'explain';

  // Check if tool is enabled
  const isEnabled = await toolConfigService.isToolEnabled(toolType);
  if (!isEnabled) {
    return res.status(403).json({
      success: false,
      message: 'Công cụ này hiện đang tạm ngưng hoạt động'
    });
  }

  // Check cooldown
  const cooldownCheck = await checkCooldown(userId, toolType);
  if (!cooldownCheck.allowed) {
    return res.status(429).json({
      success: false,
      message: cooldownCheck.message,
      remainingSeconds: cooldownCheck.remainingSeconds
    });
  }

  // Get cost and check credits
  const creditsUsed = await walletService.getCreditCost(toolType);
  const hasCredits = await walletService.hasEnoughCredits(userId, toolType);
  
  if (!hasCredits) {
    const wallet = await walletService.getWallet(userId);
    return res.status(402).json({
      success: false,
      message: 'Không đủ credits để thực hiện',
      required: creditsUsed,
      available: wallet.totalCredits
    });
  }

  const requestId = uuidv4();
  const startTime = Date.now();
  
  await AIRequest.create({
    request_id: requestId,
    user_id: userId,
    tool_type: toolType,
    credits_used: creditsUsed,
    status: 'pending'
  });

  try {
    const result = await geminiService.generateExplanation(
      text, 
      mode,
      withExamples
    );
    const processingTime = Date.now() - startTime;

    const updatedWallet = await walletService.deductCredits(
      userId, 
      toolType
    );
    
    await AIRequest.updateStatus(
      requestId, 
      'success', 
      processingTime
    );

    // Manual save only - user will save via /save-history endpoint

    res.json({
      success: true,
      data: {
        explanation: result,
        creditsUsed,
        processingTime,
        remainingCredits: updatedWallet.totalCredits
      }
    });

  } catch (error) {
    await AIRequest.updateStatus(requestId, 'failed', 0);
    throw error;
  }
});

// Rewrite Text
exports.rewriteText = asyncHandler(async (req, res) => {
  const { text, style } = req.body;
  const userId = req.user.id;
  const toolType = 'rewrite';

  // Check if tool is enabled
  const isEnabled = await toolConfigService.isToolEnabled(toolType);
  if (!isEnabled) {
    return res.status(403).json({
      success: false,
      message: 'Công cụ này hiện đang tạm ngưng hoạt động'
    });
  }

  // Check cooldown
  const cooldownCheck = await checkCooldown(userId, toolType);
  if (!cooldownCheck.allowed) {
    return res.status(429).json({
      success: false,
      message: cooldownCheck.message,
      remainingSeconds: cooldownCheck.remainingSeconds
    });
  }

  // Get cost and check credits
  const creditsUsed = await walletService.getCreditCost(toolType);
  const hasCredits = await walletService.hasEnoughCredits(userId, toolType);
  
  if (!hasCredits) {
    const wallet = await walletService.getWallet(userId);
    return res.status(402).json({
      success: false,
      message: 'Không đủ credits để thực hiện',
      required: creditsUsed,
      available: wallet.totalCredits
    });
  }

  const requestId = uuidv4();
  const startTime = Date.now();
  
  await AIRequest.create({
    request_id: requestId,
    user_id: userId,
    tool_type: toolType,
    credits_used: creditsUsed,
    status: 'pending'
  });

  try {
    const result = await geminiService.rewriteText(text, style);
    const processingTime = Date.now() - startTime;

    const updatedWallet = await walletService.deductCredits(
      userId, 
      toolType
    );
    
    await AIRequest.updateStatus(
      requestId, 
      'success', 
      processingTime
    );

    // Manual save only - user will save via /save-history endpoint

    res.json({
      success: true,
      data: {
        rewrittenText: result,
        creditsUsed,
        processingTime,
        remainingCredits: updatedWallet.totalCredits
      }
    });

  } catch (error) {
    await AIRequest.updateStatus(requestId, 'failed', 0);
    throw error;
  }
});

// Estimate credits
exports.estimateCredits = asyncHandler(async (req, res) => {
  const { toolType } = req.body;
  
  const creditsNeeded = (await walletService.getCreditCost(toolType)) || 1;

  res.json({
    success: true,
    data: {
      toolType,
      creditsRequired: creditsNeeded
    }
  });
});
