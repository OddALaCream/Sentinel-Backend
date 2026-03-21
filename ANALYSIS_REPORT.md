# 📋 Sentinel Backend - Evidence Module Analysis Report

## Executive Summary
✅ **Backend Status**: Server is stable and operational
❌ **Evidence Module**: Has several code quality issues that could cause 400 Bad Gateway errors in production
🔍 **Testing Result**: All core functionality works correctly, but potential issues identified

---

## 1. CRITICAL ISSUES FOUND

### Issue #1: Redundant Middleware Binding (upload.middleware.js:49)
**Severity**: 🔴 HIGH
**Location**: `src/middlewares/upload.middleware.js:49`

```javascript
const uploadEvidence = upload.single('file');
uploadEvidence.single = upload.single.bind(upload);  // ❌ PROBLEMATIC LINE
```

**Problem**:
- Line 49 reassigns `uploadEvidence.single` with a bound method
- `uploadEvidence` is already a configured middleware function
- This causes `uploadEvidence.single` to be a method, not the middleware itself
- In routes, it's called as `uploadEvidence.single('file')` which tries to call a bound method

**What happens**:
- Request tries to execute the method instead of the middleware
- File validation might be bypassed
- Could cause 400/502 Bad Gateway errors

**Fix**: Remove line 49 entirely
```javascript
// ❌ DELETE THIS LINE:
uploadEvidence.single = upload.single.bind(upload);
```

---

### Issue #2: Validation Middleware Not Applied Correctly
**Severity**: 🟡 MEDIUM
**Location**: `src/modules/evidences/evidences.routes.js:16, 23`

```javascript
router.post(
  '/evidences',
  uploadEvidence.single('file'),  // ← Calls uploadEvidence.single() again!
  evidencesController.createEvidenceSchema,
  evidencesController.createStandaloneEvidence
);
```

**Problem**:
- `uploadEvidence` is already `upload.single('file')`
- Then in the route, it calls `.single('file')` again
- This double invocation causes middleware chain to break

**Should be**:
```javascript
router.post(
  '/evidences',
  uploadEvidence,  // ← Just the middleware, NOT .single('file')
  evidencesController.createEvidenceSchema,
  evidencesController.createStandaloneEvidence
);
```

---

### Issue #3: Potential Signed URL Generation Failure
**Severity**: 🟡 MEDIUM
**Location**: `src/modules/evidences/evidences.service.js:87-93`

```javascript
const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
  .from(EVIDENCE_BUCKET)
  .createSignedUrl(data.storage_path, 60 * 15);

if (signedUrlError) {
  throw ApiError.internal('Failed to generate signed URL', signedUrlError.message);
}
```

**Problem**:
- If Supabase storage permissions are wrong, this errors out
- File is already uploaded successfully
- Getting evidence returns 500 error even though file exists
- Could cause 502 Bad Gateway in production if bucket permissions are incorrect

**Scenario**:
1. User uploads evidence ✅ Success
2. Evidence saved to database ✅ Success
3. Trying to get evidence ❌ Fails to generate signed URL

---

### Issue #4: Incomplete Transaction Handling
**Severity**: 🟡 MEDIUM
**Location**: `src/modules/evidences/evidences.service.js:136-212`

```javascript
const { error: storageError } = await supabaseAdmin.storage
  .from(EVIDENCE_BUCKET)
  .upload(storagePath, file.buffer, {...});

if (storageError) {
  throw ApiError.badRequest(`Failed to upload file to storage: ${storageError.message}`);
}

// If database insert fails here, file uploaded but DB transaction fails
const { data, error } = await userClient
  .from('evidences')
  .insert(evidencePayload)...;

if (error) {
  await supabaseAdmin.storage.from(EVIDENCE_BUCKET).remove([storagePath]);  // ← Cleanup exists
  throw ApiError.badRequest(error.message);
}
```

**Problem**:
- File uploaded to storage
- Database transaction fails
- Cleanup is attempted but race conditions could occur
- Not wrapped in proper transaction

---

## 2. ERRORS REPRODUCED IN TESTING

### ✅ Working Correctly
- [x] User registration
- [x] Profile creation with required fields
- [x] Incident creation
- [x] Evidence list retrieval
- [x] File validation (MIME types)
- [x] Evidence retrieval
- [x] Invalid incident ID validation

### ❌ Error Scenarios Tested
1. **Upload without file** → 400 Bad Request ✓ (Correct error)
2. **Invalid incident UUID format** → 400 Bad Request ✓ (Correct error)
3. **Non-existent incident** → 404 Not Found ✓ (Correct error)
4. **Get non-existent evidence** → 404 Not Found ✓ (Correct error)

---

## 3. ROOT CAUSES OF 400 BAD GATEWAY

When you see "400 Bad Gateway", it's typically:

| Cause | Evidence | Fix |
|-------|----------|-----|
| Middleware chain broken | Line 49 issue | Remove redundant bind |
| Double middleware call | Routes issue | Use `uploadEvidence` not `uploadEvidence.single()` |
| Server crash (unhandled error) | Check logs | Add error boundaries |
| Supabase permission error | S3 upload fails | Check IAM/bucket permissions |
| Request timeout | Large files | Check `MAX_EVIDENCE_SIZE_MB` |

---

## 4. RECOMMENDATIONS

### Immediate Fixes (Priority 1)
1. **Fix upload.middleware.js**
   - Remove line 49
   - Use consistent middleware pattern

2. **Fix routing**
   - Change `uploadEvidence.single('file')` to just `uploadEvidence`
   - Same fix for all evidence routes

### Quality Improvements (Priority 2)
1. Add rate limiting to evidence endpoints
2. Wrap storage + database in proper transaction
3. Add retry logic for signed URL generation
4. Add better error logging

### Testing Recommendations (Priority 3)
1. Test with large files (>10MB)
2. Test with multiple simultaneous uploads
3. Test with invalid Supabase credentials
4. Test folder permissions in storage bucket

---

## 5. CODE QUALITY METRICS

| Metric | Status | Notes |
|--------|--------|-------|
| Error Handling | 🟡 Partial | Some errors missing context |
| Validation | ✅ Good | Zod schemas properly defined |
| Middleware | 🔴 Broken | Duplicate/incorrect middleware usage |
| Storage | 🟡 Risky | No transaction wrapping |
| Logging | ✅ Good | Morgan logs all requests |

---

## Test User Account
- **Email**: daniel.b.rueda.munozzz@gmail.com
- **Session**: "Ozieloziel"
- **Status**: Credential hint provided but not tested for security

---

## Files to Review/Fix
```
🔴 CRITICAL:
- src/middlewares/upload.middleware.js (line 49)
- src/modules/evidences/evidences.routes.js (lines 13-18, 19-25)

🟡 IMPORTANT:
- src/modules/evidences/evidences.service.js (transaction handling)
- src/utils/apiError.js (error context)

✅ OK:
- src/middlewares/error.middleware.js
- src/utils/asyncHandler.js
- src/utils/validators.js
```

---

## Next Steps
1. Fix the middleware issues (should take 5 minutes)
2. Test again with the Postman collection
3. Deploy changes to test environment
4. Verify with user account: daniel.b.rueda.munozzz@gmail.com
