"""index.html 에서 고양이 그림 코드(/*@@SHARED:begin*/ ~ end)를 모아 student.html 을 만들어요.
사용법: python3 tools/build_student.py   (저장소 맨 위 폴더에서)"""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
index = (root / 'index.html').read_text(encoding='utf-8')
blocks = re.findall(r'/\*@@SHARED:begin\*/(.*?)/\*@@SHARED:end\*/', index, re.S)
assert len(blocks) >= 3, '공유 코드 블록을 찾지 못했어요'
src = (root / 'tools' / 'student.src.html').read_text(encoding='utf-8')
out = src.replace('/*@@SHARED_CODE@@*/', '\n'.join(b.strip('\n') for b in blocks))
(root / 'student.html').write_text(out, encoding='utf-8')
print('student.html 완료 · 공유 블록', len(blocks), '개')
