# Frontend Manual Regression Checklist

Use this checklist after larger frontend changes or before deployment. It focuses on flows that unit tests cannot fully cover in a real browser.

## 1. Startup

- Run `npm run dev --prefix client`.
- Open the Vite local URL and confirm the home page loads without console errors.
- Confirm direct navigation to `/writing/grade`, `/grammar`, `/reading`, `/phonetics`, `/vocab`, `/listening`, and `/speaking` works in local dev.

## 2. Auth And Navigation

- Open guest home.
- Click login/register entry points and confirm the auth page opens.
- Close auth and confirm it returns to the expected guest page.
- Log in as a student and confirm the default student page loads.
- Log out and confirm the page returns to guest/home state.
- Log in as a teacher and confirm the teacher default page loads.

## 3. Writing Submission

- Open the writing page as a student.
- Type a short text under 20 characters and confirm validation blocks submission.
- Type a valid essay and submit.
- Confirm loading state appears and the page does not duplicate submissions from one click.
- Upload or paste a writing image and confirm OCR text is appended when the backend is available.
- Upload a non-image file and confirm it is rejected with a friendly message.
- Upload an image over 5MB and confirm it is rejected before OCR starts.

## 4. Feedback View

- Open a writing record with feedback.
- Switch between `题目分析` and `写作评价`.
- Confirm sparse feedback does not crash the page.
- Confirm partial or failed question analysis still shows the available fallback content.
- Check `summary`, `speech`, `letter`, `report`, `continuation`, `argumentative`, and `expository` feedback when sample data is available.

## 5. Export

- Click `导出 PDF` in the feedback view.
- Allow the popup and confirm the print window opens with the expected title, score, question analysis, writing evaluation, and teacher comment.
- Block popups and confirm the page shows the popup permission warning.

## 6. Responsive Smoke Check

- Test the home page, writing page, and feedback page at desktop width.
- Test the same pages using a mobile viewport in browser devtools.
- Confirm navigation, text inputs, image upload, tab switching, and export button remain usable.

## 7. Public Product Pages

- Open `/reading`, `/reading/analyzer`, `/reading/practice`, `/reading/paper`, `/reading/courses`, and `/reading/progress`.
- Open `/phonetics`, `/phonetics/sound`, `/phonetics/combos`, `/phonetics/syllable`, `/phonetics/words`, and `/phonetics/sentence`.
- Open `/vocab`, `/vocab/reading`, `/vocab/writing`, `/vocab/synonym`, `/vocab/flashcard`, and `/vocab/import`.
- Open `/listening`, `/listening/basics`, `/listening/advanced`, and `/listening/practice`.
- Open `/speaking`.
- Open the account subscription surface from `mine` or account profile; it should show subscription details without exposing a standalone pricing page.
- For each page, confirm the page body is non-empty, the product top bar is visible, and switching to writing/grammar/reading/phonetics/vocab/listening/speaking from the product menu does not return to the wrong default page.
- On phonetics pages, confirm `/phonetics/sound` shows the 音素/音标 content, `/phonetics/combos` shows 字母组合, and `/phonetics/syllable` shows the standalone 音节 page.
- On vocab pages, confirm `/vocab/flashcard` opens directly in flashcard mode and marking one word as known does not skip the next word.

## 8. Deployment Smoke Check

- Run `npm run build --prefix client`.
- Run `npm run preview --prefix client`.
- Open `/`, `/writing/grade`, `/phonetics/sound`, `/vocab/flashcard`, `/listening/practice`, `/app/tasks`, `/app/workbench`, and one feedback/detail route directly in a new tab.
- If deployed behind a server, confirm unknown frontend paths fall back to `index.html` instead of returning a server 404.
