Write unit tests for the [ComponentName] React component using Jest and TypeScript.

# Unit test requirements:
## 1. General
- Use strict TypeScript types throughout.
- Target Node.js 23 and React 18.
- Do not use deprecated React APIs or unstable features.
- No comments in test code.
- Keep code minimal, no unnecessary imports/boilerplate.
## 2. Project structure
- Place tests in /src/__tests__ folder, mirroring component hierarchy.
## 3. Imports and dependencies
- Import only what is required from React, testing libraries, and the component itself. Don’t import unnecessary helpers or modules.
## 4. Mocks
- Use shared or default mocks from frontend/src/__tests__/__mocks__ for all tests.
- Import base mocks at the top of the test file.
- If a test scenario requires a different mock implementation, override or extend the relevant mock locally in that test file, but only for the necessary case.
- Do not redefine mocks globally unless strictly necessary.
- Mock functions with jest.fn() only when strictly necessary.
## 5. Test data and props
- Test data and mock props should be minimal but valid per component TypeScript types. Do not use random values or auto-generated data. 
- Make sure all test code and test props strictly follow the TypeScript types defined for the component.
## 6. Testing style and patterns
- Use the Arrange-Act-Assert (AAA) pattern.
- Use descriptive test names.
## 7. Scenarios to cover
- Rendering (default, with different props)
- Props validation (valid/invalid/missing)
- Events (clicks, inputs, etc.)
- Conditional rendering
- Edge/error cases (if any)
- Include snapshot tests only if the component has complex conditional rendering or visually distinct states. Otherwise, skip snapshot testing.
- If component throws or displays errors, ensure that error messages match expectations.
## 8. Verification and post-analysis
- Before finishing, verify that the code would pass npm test (assume standard Jest + React 18 setup).
- After writing tests, list which lines/branches are not covered (if any) and explain why.
## 9. Reference tests
- When writing new tests, use existing tests for similar components as reference.
- Match structure, naming conventions, and mocking patterns used in legacy tests from /src/__tests__ or other relevant test files in the project.
- Ensure consistency in test organization and style with previous implementations.
- Do not introduce new patterns or tools unless there's a clear reason and prior discussion.
