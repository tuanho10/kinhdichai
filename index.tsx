
      import React, { useState, useEffect, useMemo, useCallback } from 'react';
      import { createRoot } from 'react-dom/client';
      import { GoogleGenAI, Type } from "@google/genai";

      // --- TYPES AND CONSTANTS ---

      const API_KEY = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;

      type LineValue = 6 | 7 | 8 | 9;
      type LineType = 'yang' | 'yin';
      type Trigram = 'Càn' | 'Khảm' | 'Cấn' | 'Chấn' | 'Tốn' | 'Ly' | 'Khôn' | 'Đoài';

      interface HexagramData {
        number: number;
        hanTu: string;
        vietnameseName: string;
      }

      interface CastingResult {
        question: string;
        method: 'Cỏ Thi' | 'Mai Hoa';
        lines: LineValue[];
        primaryHexagram: HexagramData;
        transformedHexagram: HexagramData | null;
        movingLinesIndices: number[];
      }

      interface AiInterpretation {
        title: string;
        summary: string;
        detailedAnalysis: {
          primaryHexagram: string;
          transformedHexagram: string;
        };
        actionableAdvice: string[];
      }

      interface HistoryEntry extends CastingResult {
        id: string;
        date: string;
        aiInterpretation: AiInterpretation;
      }
      
      interface MaiHoaCalculation {
        upperNum: number;
        lowerNum: number;
        movingNum: number;
        upperTrigram: Trigram;
        lowerTrigram: Trigram;
        movingLineIndex: number; // 0-5
      }

      const trigramMap: { [key: string]: Trigram } = {
        '111': 'Càn', '010': 'Khảm', '100': 'Cấn', '001': 'Chấn',
        '110': 'Tốn', '101': 'Ly', '000': 'Khôn', '011': 'Đoài'
      };

      const numberToTrigramData: { [key: number]: { name: Trigram, lines: LineType[] } } = {
        1: { name: 'Càn', lines: ['yang', 'yang', 'yang'] },
        2: { name: 'Đoài', lines: ['yin', 'yang', 'yang'] },
        3: { name: 'Ly', lines: ['yang', 'yin', 'yang'] },
        4: { name: 'Chấn', lines: ['yin', 'yin', 'yang'] },
        5: { name: 'Tốn', lines: ['yang', 'yang', 'yin'] },
        6: { name: 'Khảm', lines: ['yin', 'yang', 'yin'] },
        7: { name: 'Cấn', lines: ['yang', 'yin', 'yin'] },
        8: { name: 'Khôn', lines: ['yin', 'yin', 'yin'] },
      };

      const HEXAGRAM_DATA: HexagramData[] = [
          { number: 1, hanTu: "䷀", vietnameseName: "Thuần Càn" }, { number: 2, hanTu: "䷁", vietnameseName: "Thuần Khôn" },
          { number: 3, hanTu: "䷂", vietnameseName: "Thủy Lôi Truân" }, { number: 4, hanTu: "䷃", vietnameseName: "Sơn Thủy Mông" },
          { number: 5, hanTu: "䷄", vietnameseName: "Thủy Thiên Nhu" }, { number: 6, hanTu: "䷅", vietnameseName: "Thiên Thủy Tụng" },
          { number: 7, hanTu: "䷆", vietnameseName: "Địa Thủy Sư" }, { number: 8, hanTu: "䷇", vietnameseName: "Thủy Địa Tỷ" },
          { number: 9, hanTu: "䷈", vietnameseName: "Phong Thiên Tiểu Súc" }, { number: 10, hanTu: "䷉", vietnameseName: "Thiên Trạch Lý" },
          { number: 11, hanTu: "䷊", vietnameseName: "Địa Thiên Thái" }, { number: 12, hanTu: "䷋", vietnameseName: "Thiên Địa Bĩ" },
          { number: 13, hanTu: "䷌", vietnameseName: "Thiên Hỏa Đồng Nhân" }, { number: 14, hanTu: "䷍", vietnameseName: "Hỏa Thiên Đại Hữu" },
          { number: 15, hanTu: "䷎", vietnameseName: "Địa Sơn Khiêm" }, { number: 16, hanTu: "䷏", vietnameseName: "Lôi Địa Dự" },
          { number: 17, hanTu: "䷐", vietnameseName: "Trạch Lôi Tùy" }, { number: 18, hanTu: "䷑", vietnameseName: "Sơn Phong Cổ" },
          { number: 19, hanTu: "䷒", vietnameseName: "Địa Trạch Lâm" }, { number: 20, hanTu: "䷓", vietnameseName: "Phong Địa Quan" },
          { number: 21, hanTu: "䷔", vietnameseName: "Hỏa Lôi Phệ Hạp" }, { number: 22, hanTu: "䷕", vietnameseName: "Sơn Hỏa Bí" },
          { number: 23, hanTu: "䷖", vietnameseName: "Sơn Địa Bác" }, { number: 24, hanTu: "䷗", vietnameseName: "Địa Lôi Phục" },
          { number: 25, hanTu: "䷘", vietnameseName: "Thiên Lôi Vô Vọng" }, { number: 26, hanTu: "䷙", vietnameseName: "Sơn Thiên Đại Súc" },
          { number: 27, hanTu: "䷚", vietnameseName: "Sơn Lôi Di" }, { number: 28, hanTu: "䷛", vietnameseName: "Trạch Phong Đại Quá" },
          { number: 29, hanTu: "䷜", vietnameseName: "Thuần Khảm" }, { number: 30, hanTu: "䷝", vietnameseName: "Thuần Ly" },
          { number: 31, hanTu: "䷞", vietnameseName: "Trạch Sơn Hàm" }, { number: 32, hanTu: "䷟", vietnameseName: "Lôi Phong Hằng" },
          { number: 33, hanTu: "䷠", vietnameseName: "Thiên Sơn Độn" }, { number: 34, hanTu: "䷡", vietnameseName: "Lôi Thiên Đại Tráng" },
          { number: 35, hanTu: "䷢", vietnameseName: "Hỏa Địa Tấn" }, { number: 36, hanTu: "䷣", vietnameseName: "Địa Hỏa Minh Di" },
          { number: 37, hanTu: "䷤", vietnameseName: "Phong Hỏa Gia Nhân" }, { number: 38, hanTu: "䷥", vietnameseName: "Hỏa Trạch Khuê" },
          { number: 39, hanTu: "䷦", vietnameseName: "Thủy Sơn Kiển" }, { number: 40, hanTu: "䷧", vietnameseName: "Lôi Thủy Giải" },
          { number: 41, hanTu: "䷨", vietnameseName: "Sơn Trạch Tốn" }, { number: 42, hanTu: "䷩", vietnameseName: "Phong Lôi Ích" },
          { number: 43, hanTu: "䷪", vietnameseName: "Trạch Thiên Quải" }, { number: 44, hanTu: "䷫", vietnameseName: "Thiên Phong Cấu" },
          { number: 45, hanTu: "䷬", vietnameseName: "Trạch Địa Tụy" }, { number: 46, hanTu: "䷭", vietnameseName: "Địa Phong Thăng" },
          { number: 47, hanTu: "䷮", vietnameseName: "Trạch Thủy Khốn" }, { number: 48, hanTu: "䷯", vietnameseName: "Thủy Phong Tỉnh" },
          { number: 49, hanTu: "䷰", vietnameseName: "Trạch Hỏa Cách" }, { number: 50, hanTu: "䷱", vietnameseName: "Hỏa Phong Đỉnh" },
          { number: 51, hanTu: "䷲", vietnameseName: "Thuần Chấn" }, { number: 52, hanTu: "䷳", vietnameseName: "Thuần Cấn" },
          { number: 53, hanTu: "䷴", vietnameseName: "Phong Sơn Tiệm" }, { number: 54, hanTu: "䷵", vietnameseName: "Lôi Trạch Quy Muội" },
          { number: 55, hanTu: "䷶", vietnameseName: "Lôi Hỏa Phong" }, { number: 56, hanTu: "䷷", vietnameseName: "Hỏa Sơn Lữ" },
          { number: 57, hanTu: "䷸", vietnameseName: "Thuần Tốn" }, { number: 58, hanTu: "䷹", vietnameseName: "Thuần Đoài" },
          { number: 59, hanTu: "䷺", vietnameseName: "Phong Thủy Hoán" }, { number: 60, hanTu: "䷻", vietnameseName: "Thủy Trạch Tiết" },
          { number: 61, hanTu: "䷼", vietnameseName: "Phong Trạch Trung Phu" }, { number: 62, hanTu: "䷽", vietnameseName: "Lôi Sơn Tiểu Quá" },
          { number: 63, hanTu: "䷾", vietnameseName: "Thủy Hỏa Ký Tế" }, { number: 64, hanTu: "䷿", vietnameseName: "Hỏa Thủy Vị Tế" }
      ];

      const hexagramLookup = new Map(HEXAGRAM_DATA.map(h => [h.vietnameseName, h]));

      // --- HELPER FUNCTIONS ---

      const getLineTypeFromValue = (value: LineValue): LineType => (value === 7 || value === 9) ? 'yang' : 'yin';
      const isMovingLine = (value: LineValue): boolean => value === 6 || value === 9;

      const getHexagramFromLines = (lines: LineType[]): HexagramData | undefined => {
          if (lines.length !== 6) return undefined;
          const lowerTrigramKey = lines.slice(0, 3).map(l => l === 'yang' ? '1' : '0').join('');
          const upperTrigramKey = lines.slice(3, 6).map(l => l === 'yang' ? '1' : '0').join('');
          
          const lowerTrigram = trigramMap[lowerTrigramKey];
          const upperTrigram = trigramMap[upperTrigramKey];

          const fullHexagramMap = {
              "Khôn-Khôn": "Thuần Khôn", "Khôn-Chấn": "Địa Lôi Phục", "Khôn-Khảm": "Địa Thủy Sư", "Khôn-Cấn": "Địa Sơn Khiêm",
              "Chấn-Khôn": "Lôi Địa Dự", "Chấn-Chấn": "Thuần Chấn", "Chấn-Khảm": "Lôi Thủy Giải", "Chấn-Cấn": "Lôi Sơn Tiểu Quá",
              "Khảm-Khôn": "Thủy Địa Tỷ", "Khảm-Chấn": "Thủy Lôi Truân", "Khảm-Khảm": "Thuần Khảm", "Khảm-Cấn": "Thủy Sơn Kiển",
              "Cấn-Khôn": "Sơn Địa Bác", "Cấn-Chấn": "Sơn Lôi Di", "Cấn-Khảm": "Sơn Thủy Mông", "Cấn-Cấn": "Thuần Cấn",
              "Khôn-Tốn": "Địa Phong Thăng", "Khôn-Ly": "Địa Hỏa Minh Di", "Khôn-Đoài": "Địa Trạch Lâm", "Khôn-Càn": "Địa Thiên Thái",
              "Chấn-Tốn": "Lôi Phong Hằng", "Chấn-Ly": "Lôi Hỏa Phong", "Chấn-Đoài": "Lôi Trạch Quy Muội", "Chấn-Càn": "Lôi Thiên Đại Tráng",
              "Khảm-Tốn": "Thủy Phong Tỉnh", "Khảm-Ly": "Thủy Hỏa Ký Tế", "Khảm-Đoài": "Thủy Trạch Tiết", "Khảm-Càn": "Thủy Thiên Nhu",
              "Cấn-Tốn": "Sơn Phong Cổ", "Cấn-Ly": "Sơn Hỏa Bí", "Cấn-Đoài": "Sơn Trạch Tốn", "Cấn-Càn": "Sơn Thiên Đại Súc",
              "Tốn-Khôn": "Phong Địa Quan", "Tốn-Chấn": "Phong Lôi Ích", "Tốn-Khảm": "Phong Thủy Hoán", "Tốn-Cấn": "Phong Sơn Tiệm",
              "Ly-Khôn": "Hỏa Địa Tấn", "Ly-Chấn": "Hỏa Lôi Phệ Hạp", "Ly-Khảm": "Hỏa Thủy Vị Tế", "Ly-Cấn": "Hỏa Sơn Lữ",
              "Đoài-Khôn": "Trạch Địa Tụy", "Đoài-Chấn": "Trạch Lôi Tùy", "Đoài-Khảm": "Trạch Thủy Khốn", "Đoài-Cấn": "Trạch Sơn Hàm",
              "Càn-Khôn": "Thiên Địa Bĩ", "Càn-Chấn": "Thiên Lôi Vô Vọng", "Càn-Khảm": "Thiên Thủy Tụng", "Càn-Cấn": "Thiên Sơn Độn",
              "Tốn-Tốn": "Thuần Tốn", "Tốn-Ly": "Phong Hỏa Gia Nhân", "Tốn-Đoài": "Phong Trạch Trung Phu", "Tốn-Càn": "Phong Thiên Tiểu Súc",
              "Ly-Tốn": "Hỏa Phong Đỉnh", "Ly-Ly": "Thuần Ly", "Ly-Đoài": "Hỏa Trạch Khuê", "Ly-Càn": "Hỏa Thiên Đại Hữu",
              "Đoài-Tốn": "Trạch Phong Đại Quá", "Đoài-Ly": "Trạch Hỏa Cách", "Đoài-Đoài": "Thuần Đoài", "Đoài-Càn": "Trạch Thiên Quải",
              "Càn-Tốn": "Thiên Phong Cấu", "Càn-Ly": "Thiên Hỏa Đồng Nhân", "Càn-Đoài": "Thiên Trạch Lý", "Càn-Càn": "Thuần Càn",
          };

          const hexName = fullHexagramMap[`${upperTrigram}-${lowerTrigram}`];
          return hexagramLookup.get(hexName);
      };

      const processLines = (lines: LineValue[]) => {
          const primaryLines = lines.map(getLineTypeFromValue);
          const movingLinesIndices = lines.map((l, i) => isMovingLine(l) ? i : -1).filter(i => i !== -1);
          
          const primaryHexagram = getHexagramFromLines(primaryLines);
          let transformedHexagram: HexagramData | null = null;
          
          if (movingLinesIndices.length > 0) {
              const transformedLines = primaryLines.map((type, i) => {
                  if (movingLinesIndices.includes(i)) {
                      return type === 'yang' ? 'yin' : 'yang';
                  }
                  return type;
              });
              transformedHexagram = getHexagramFromLines(transformedLines);
          }

          return { primaryHexagram, transformedHexagram, movingLinesIndices };
      }


      // --- API ---

      let ai;

      async function fetchAiInterpretation(result: CastingResult): Promise<AiInterpretation> {
          if (!API_KEY) {
            throw new Error("Khóa API chưa được định cấu hình. Vui lòng đảm bảo biến môi trường API_KEY đã được thiết lập chính xác.");
          }
          if (!ai) {
              ai = new GoogleGenAI({ apiKey: API_KEY });
          }
          
          const { question, primaryHexagram, transformedHexagram } = result;

          const prompt = `
              Câu hỏi: "${question}"
              Quẻ chính: ${primaryHexagram.vietnameseName} (${primaryHexagram.hanTu})
              ${transformedHexagram ? `Quẻ biến: ${transformedHexagram.vietnameseName} (${transformedHexagram.hanTu})` : ''}
              Hãy luận giải quẻ này.
          `;

          const responseSchema = {
              type: Type.OBJECT,
              properties: {
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  detailedAnalysis: {
                      type: Type.OBJECT,
                      properties: {
                          primaryHexagram: { type: Type.STRING },
                          transformedHexagram: { type: Type.STRING },
                      },
                      required: ['primaryHexagram']
                  },
                  actionableAdvice: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                  },
              },
              required: ['title', 'summary', 'detailedAnalysis', 'actionableAdvice']
          };

          try {
              const response = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: prompt,
                  config: {
                      responseMimeType: "application/json",
                      responseSchema: responseSchema,
                      systemInstruction: "Bạn là một chuyên gia Kinh Dịch uyên thâm. Hãy luận giải quẻ một cách sâu sắc, rõ ràng, và thực tế bằng tiếng Việt, tuân thủ nghiêm ngặt định dạng JSON được yêu cầu.",
                  },
              });
              
              const jsonText = response.text.trim();
              return JSON.parse(jsonText) as AiInterpretation;
          } catch (error) {
              console.error("Lỗi khi gọi Gemini API:", error);
              throw new Error("Không thể nhận luận giải từ AI. Vui lòng thử lại.");
          }
      }


      // --- COMPONENTS ---

      const RollingNumber: React.FC<{ target: number }> = ({ target }) => {
          const numberRef = React.useRef<HTMLSpanElement>(null);

          useEffect(() => {
              if (!numberRef.current) return;

              let frameId: number;
              const duration = 1500; // Animate for 1.5 seconds
              const startTime = performance.now();

              const animate = (currentTime: number) => {
                  const elapsedTime = currentTime - startTime;

                  if (elapsedTime < duration) {
                      if (numberRef.current) {
                          numberRef.current.textContent = String(Math.floor(Math.random() * 100) + 1);
                      }
                      frameId = requestAnimationFrame(animate);
                  } else {
                      if (numberRef.current) {
                          numberRef.current.textContent = String(target);
                      }
                  }
              };

              frameId = requestAnimationFrame(animate);

              return () => {
                  cancelAnimationFrame(frameId);
              };
          }, [target]);
          
          return <span ref={numberRef} className="random-number">0</span>;
      };

      const Line: React.FC<{ type: LineType, isMoving: boolean }> = ({ type, isMoving }) => (
          <div className={`line line-${type} ${isMoving ? 'moving' : ''}`}>
              {isMoving && <span className="dynamic-badge">ĐỘNG</span>}
          </div>
      );

      const Hexagram: React.FC<{ lines: LineType[], movingIndices: number[] }> = ({ lines, movingIndices }) => (
          <div className="hexagram">
              {lines.map((type, i) => (
                  <Line key={i} type={type} isMoving={movingIndices.includes(i)} />
              ))}
          </div>
      );

      const HomeScreen: React.FC<{ onStart: (question: string) => void, onHistory: () => void }> = ({ onStart, onHistory }) => {
          const [question, setQuestion] = useState('');

          return (
              <div className="home-screen main-content">
                  <h1>Kinh Dịch AI</h1>
                  <p>Đặt một câu hỏi chân thành và tập trung vào vấn đề bạn đang suy nghĩ. Vũ trụ sẽ trả lời.</p>
                  <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ví dụ: Công việc sắp tới của tôi sẽ như thế nào?"
                      rows={4}
                  />
                  <div>
                      <button className="button" onClick={() => onStart(question)} disabled={!question.trim()}>
                          Gieo Quẻ
                      </button>
                      <button className="button secondary" onClick={onHistory}>
                          Xem Lịch Sử
                      </button>
                  </div>
              </div>
          );
      };

      const MethodSelectionModal: React.FC<{ onSelect: (method: 'Cỏ Thi' | 'Mai Hoa') => void }> = ({ onSelect }) => {
          return (
              <div className="modal-overlay">
                  <div className="modal-content">
                      <h2>Chọn phương pháp gieo quẻ</h2>
                      <div className="method-selection">
                          <div className="method-card" onClick={() => onSelect('Cỏ Thi')}>
                              <span>🪶</span>
                              <h3>Cỏ Thi</h3>
                              <p>Cổ xưa, chi tiết</p>
                          </div>
                          <div className="method-card" onClick={() => onSelect('Mai Hoa')}>
                              <span>🌸</span>
                              <h3>Mai Hoa</h3>
                              <p>Nhanh chóng, trực quan</p>
                          </div>
                      </div>
                  </div>
              </div>
          );
      };
      
      const YarrowStalkAnimation: React.FC<{ active: boolean }> = ({ active }) => {
        const stalks = useMemo(() => {
            return Array.from({ length: 17 }).map((_, i) => {
                const xPos = (i - 8) * 6.5; // (length-1)/2, multiplier adjusted for spread
                const randomRotate = (Math.random() - 0.5) * 15; // Give a slight, natural tilt
                const randomY = Math.random() * 5; // Slight vertical variation
                return {
                    '--initial-transform': `translateX(${xPos}px) translateY(${randomY}px) rotate(${randomRotate}deg)`,
                };
            });
        }, []);

        return (
            <div className={`yarrow-stalks-container ${active ? 'active' : ''}`}>
                {stalks.map((style, i) => (
                    <div
                        key={i}
                        className="yarrow-stalk"
                        // FIX: Cast style to React.CSSProperties to allow for custom CSS properties.
                        style={style as React.CSSProperties}
                    />
                ))}
            </div>
        );
      };

      const PlumBlossomAnimation: React.FC<{ calculation: MaiHoaCalculation | null }> = ({ calculation }) => {
          if (!calculation) {
              return null;
          }
          const { upperNum, lowerNum, movingNum } = calculation;
          return (
              <div className="plum-blossom-animation">
                  <div className="plum-blossom-calculation">
                      <p><RollingNumber target={upperNum} /> % 8 = <span>{upperNum % 8 || 8}</span></p>
                      <p><RollingNumber target={lowerNum} /> % 8 = <span>{lowerNum % 8 || 8}</span></p>
                      <p><RollingNumber target={movingNum} /> % 6 = <span>{movingNum % 6 || 6}</span></p>
                  </div>
              </div>
          );
      };


      const CastingScreen: React.FC<{ method: 'Cỏ Thi' | 'Mai Hoa', onComplete: (lines: LineValue[]) => void }> = ({ method, onComplete }) => {
          const [displayLines, setDisplayLines] = useState<LineValue[]>([]);
          const [stepMessage, setStepMessage] = useState('');
          const [isAnimating, setIsAnimating] = useState(false);
          const [maiHoaCalc, setMaiHoaCalc] = useState<MaiHoaCalculation | null>(null);

          useEffect(() => {
              // Reset state to prevent bugs when switching methods
              setDisplayLines([]);
              setStepMessage('');
              setIsAnimating(false);
              setMaiHoaCalc(null);

              // FIX: Use correct timer ID types for compatibility with Node.js and browser environments.
              let maiHoaTimeout1: ReturnType<typeof setTimeout>;
              let maiHoaTimeout2: ReturnType<typeof setTimeout>;
              let coThiInterval: ReturnType<typeof setInterval>;

              if (method === 'Mai Hoa') {
                  const upperNum = Math.floor(Math.random() * 100) + 1;
                  const lowerNum = Math.floor(Math.random() * 100) + 1;
                  const movingNum = Math.floor(Math.random() * 100) + 1;

                  const upperTrigramKey = upperNum % 8 || 8;
                  const lowerTrigramKey = lowerNum % 8 || 8;
                  const movingLineIndex = (movingNum % 6 || 6) - 1;

                  const calc: MaiHoaCalculation = {
                      upperNum, lowerNum, movingNum,
                      upperTrigram: numberToTrigramData[upperTrigramKey].name,
                      lowerTrigram: numberToTrigramData[lowerTrigramKey].name,
                      movingLineIndex,
                  };
                  setMaiHoaCalc(calc);

                  const lowerLines = numberToTrigramData[lowerTrigramKey].lines;
                  const upperLines = numberToTrigramData[upperTrigramKey].lines;
                  const primaryHexagramLines: LineType[] = [...lowerLines, ...upperLines];

                  const finalLines = primaryHexagramLines.map((type, i) => {
                      return i === movingLineIndex
                          ? (type === 'yang' ? 9 : 6)
                          : (type === 'yang' ? 7 : 8);
                  }) as LineValue[];
                  
                  setStepMessage(`Đang tính toán theo Mai Hoa...`);

                  maiHoaTimeout1 = setTimeout(() => {
                      setDisplayLines(finalLines);
                      setStepMessage('Quẻ đã thành.');
                  }, 1800);
                  
                  maiHoaTimeout2 = setTimeout(() => {
                      onComplete(finalLines);
                  }, 4000);

              } else { // Cỏ Thi
                  const accumulatedLines: LineValue[] = [];
                  let currentLineIndex = 0;
                  coThiInterval = setInterval(() => {
                      if (currentLineIndex >= 6) {
                          clearInterval(coThiInterval);
                          onComplete(accumulatedLines);
                          return;
                      }

                      setIsAnimating(true);
                      setStepMessage(`Đang gieo hào ${currentLineIndex + 1}/6...`);
                      
                      let newLineVal: LineValue;
                      const rand = Math.random();
                      if (rand < 0.125) newLineVal = 6;
                      else if (rand < 0.375) newLineVal = 8;
                      else if (rand < 0.875) newLineVal = 7;
                      else newLineVal = 9;
                      accumulatedLines.push(newLineVal);
                      
                      setDisplayLines(prev => [...prev, newLineVal]);

                      setTimeout(() => setIsAnimating(false), 800);
                      
                      currentLineIndex++;
                  }, 2000);
              }

              // Comprehensive cleanup function to prevent state conflicts
              return () => {
                  clearTimeout(maiHoaTimeout1);
                  clearTimeout(maiHoaTimeout2);
                  clearInterval(coThiInterval);
              };
          }, [method, onComplete]);

          return (
              <div className="main-content">
                  <div className="casting-screen-header">
                      <h2>Đang gieo quẻ theo phương pháp {method}</h2>
                      <p>Xin hãy giữ tâm thanh tịnh và tập trung vào câu hỏi...</p>
                  </div>
                  <div className="casting-screen">
                      <div className="casting-animation-container">
                          {method === 'Cỏ Thi' ? (
                              <YarrowStalkAnimation active={isAnimating} />
                          ) : (
                              <PlumBlossomAnimation calculation={maiHoaCalc} />
                          )}
                      </div>
                      <div className="casting-result-container">
                          <div className="hexagram">
                              {displayLines.map((val, i) => (
                                  <Line key={i} type={getLineTypeFromValue(val)} isMoving={isMovingLine(val)} />
                              ))}
                          </div>
                          <div className="step">{stepMessage}</div>
                      </div>
                  </div>
              </div>
          );
      };

      const ResultScreen: React.FC<{ result: CastingResult, aiInterpretation: AiInterpretation | null, isLoading: boolean, error: string | null, onReset: () => void }> = ({ result, aiInterpretation, isLoading, error, onReset }) => {
          const primaryLines = result.lines.map(getLineTypeFromValue);
          const transformedLines = useMemo(() => {
              if (!result.transformedHexagram) return null;
              return primaryLines.map((type, i) => result.movingLinesIndices.includes(i) ? (type === 'yang' ? 'yin' : 'yang') : type);
          }, [result, primaryLines]);

          return (
              <div className="result-screen">
                  <h2>Kết quả gieo quẻ</h2>
                  <div className="hexagrams-display">
                      <div className="hexagram-container">
                          <div className="hexagram-name">{result.primaryHexagram.hanTu} {result.primaryHexagram.vietnameseName}</div>
                          <Hexagram lines={primaryLines} movingIndices={result.movingLinesIndices} />
                          <div className="hexagram-label">Quẻ Chính</div>
                          <div className="hexagram-number">(Số {result.primaryHexagram.number})</div>
                      </div>
                      {result.transformedHexagram && transformedLines && (
                          <div className="hexagram-container">
                              <div className="hexagram-name">{result.transformedHexagram.hanTu} {result.transformedHexagram.vietnameseName}</div>
                              <Hexagram lines={transformedLines} movingIndices={[]} />
                              <div className="hexagram-label">Quẻ Biến</div>
                              <div className="hexagram-number">(Số {result.transformedHexagram.number})</div>
                          </div>
                      )}
                  </div>
                  <div className="ai-interpretation">
                      {isLoading && (
                          <div style={{ textAlign: "center" }}>
                            <div className="spinner" aria-label="Đang tải luận giải"></div>
                            <p>Vui lòng chờ AI luận giải...</p>
                          </div>
                      )}
                      {error && <p style={{ color: '#e57373' }}>{error}</p>}
                      {aiInterpretation && (
                          <>
                              <h3>{aiInterpretation.title}</h3>
                              <p><strong>Tóm tắt:</strong> {aiInterpretation.summary}</p>
                              <h4>Luận giải chi tiết</h4>
                              <p><strong>Quẻ chính:</strong> {aiInterpretation.detailedAnalysis.primaryHexagram}</p>
                              {aiInterpretation.detailedAnalysis.transformedHexagram && <p><strong>Quẻ biến:</strong> {aiInterpretation.detailedAnalysis.transformedHexagram}</p>}
                              <h4>Gợi ý hành động</h4>
                              <ul>
                                  {aiInterpretation.actionableAdvice.map((advice, i) => <li key={i}>{advice}</li>)}
                              </ul>
                          </>
                      )}
                  </div>
                  <div style={{ textAlign: "center", marginTop: "2rem" }}>
                      <button className="button" onClick={onReset}>Gieo quẻ mới</button>
                  </div>
              </div>
          );
      };

      const HistoryScreen: React.FC<{ history: HistoryEntry[], onView: (entry: HistoryEntry) => void, onDelete: (id: string) => void, onClear: () => void, onBack: () => void }> = ({ history, onView, onDelete, onClear, onBack }) => {
          return (
              <div className="history-screen">
                  <h2>Lịch sử gieo quẻ</h2>
                  {history.length > 0 ? (
                      <ul className="history-list">
                          {history.map(entry => (
                              <li key={entry.id} className="history-item" onClick={() => onView(entry)}>
                                <div className="history-item-info">
                                      <strong>{entry.question}</strong>
                                      <span>{new Date(entry.date).toLocaleString('vi-VN')} - {entry.primaryHexagram.vietnameseName}</span>
                                </div>
                                <div className="history-item-actions">
                                      <button onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }} aria-label="Xóa mục này">🗑️</button>
                                </div>
                              </li>
                          ))}
                      </ul>
                  ) : <p>Chưa có lịch sử nào.</p>}
                  <div style={{marginTop: "2rem"}}>
                      <button className="button secondary" onClick={onBack}>Quay lại</button>
                      {history.length > 0 && <button className="button" onClick={onClear} style={{backgroundColor: "#c62828"}}>Xóa tất cả</button>}
                  </div>
              </div>
          );
      };


      const App: React.FC = () => {
          const [theme, setTheme] = useState<'light' | 'dark'>('light');
          const [screen, setScreen] = useState<'home' | 'selecting' | 'casting' | 'result' | 'history'>('home');
          const [question, setQuestion] = useState('');
          const [method, setMethod] = useState<'Cỏ Thi' | 'Mai Hoa' | null>(null);
          const [castingResult, setCastingResult] = useState<CastingResult | null>(null);
          const [aiInterpretation, setAiInterpretation] = useState<AiInterpretation | null>(null);
          const [isLoadingAi, setIsLoadingAi] = useState(false);
          const [error, setError] = useState<string | null>(null);
          const [history, setHistory] = useState<HistoryEntry[]>([]);
          
          useEffect(() => {
              const savedHistory = localStorage.getItem('kinhDichHistory');
              if (savedHistory) {
                  setHistory(JSON.parse(savedHistory));
              }
              const savedTheme = localStorage.getItem('kinhDichTheme') as 'light' | 'dark';
              if (savedTheme) {
                  setTheme(savedTheme);
              } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  setTheme('dark');
              }
          }, []);
          
          useEffect(() => {
              document.documentElement.setAttribute('data-theme', theme);
              localStorage.setItem('kinhDichTheme', theme);
          }, [theme]);

          const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

          const handleStart = (q: string) => {
              setQuestion(q);
              setScreen('selecting');
          };

          const handleMethodSelect = (m: 'Cỏ Thi' | 'Mai Hoa') => {
              setMethod(m);
              setScreen('casting');
          };
          
          const handleCastingComplete = useCallback(async (lines: LineValue[]) => {
              const { primaryHexagram, transformedHexagram, movingLinesIndices } = processLines(lines);

              if (!primaryHexagram) {
                  setError("Có lỗi trong quá trình tính quẻ. Vui lòng thử lại.");
                  setScreen('home');
                  return;
              }

              const result: CastingResult = {
                  question,
                  method: method!,
                  lines,
                  primaryHexagram,
                  transformedHexagram,
                  movingLinesIndices,
              };
              setCastingResult(result);
              setScreen('result');
              
              setIsLoadingAi(true);
              setError(null);
              setAiInterpretation(null);

              try {
                  const interpretation = await fetchAiInterpretation(result);
                  setAiInterpretation(interpretation);

                  const newHistoryEntry: HistoryEntry = {
                      ...result,
                      id: Date.now().toString(),
                      date: new Date().toISOString(),
                      aiInterpretation: interpretation,
                  };
                  
                  setHistory(prevHistory => {
                      const updatedHistory = [newHistoryEntry, ...prevHistory];
                      localStorage.setItem('kinhDichHistory', JSON.stringify(updatedHistory));
                      return updatedHistory;
                  });

              } catch (e: any) {
                  setError(e.message || "Lỗi không xác định.");
              } finally {
                  setIsLoadingAi(false);
              }
          }, [question, method]);
          
          const handleReset = () => {
              setScreen('home');
              setQuestion('');
              setMethod(null);
              setCastingResult(null);
              setAiInterpretation(null);
              setError(null);
          };

          const handleViewHistoryEntry = (entry: HistoryEntry) => {
              setCastingResult(entry);
              setAiInterpretation(entry.aiInterpretation);
              setIsLoadingAi(false);
              setError(null);
              setScreen('result');
          };

          const handleDeleteHistory = (id: string) => {
              const updatedHistory = history.filter(item => item.id !== id);
              setHistory(updatedHistory);
              localStorage.setItem('kinhDichHistory', JSON.stringify(updatedHistory));
          };

          const handleClearHistory = () => {
              if (window.confirm("Bạn có chắc muốn xóa toàn bộ lịch sử?")) {
                  setHistory([]);
                  localStorage.removeItem('kinhDichHistory');
              }
          };
          
          const renderScreen = () => {
              switch (screen) {
                  case 'selecting':
                      return <MethodSelectionModal onSelect={handleMethodSelect} />;
                  case 'casting':
                      return <CastingScreen method={method!} onComplete={handleCastingComplete} />;
                  case 'result':
                      return castingResult && <ResultScreen result={castingResult} aiInterpretation={aiInterpretation} isLoading={isLoadingAi} error={error} onReset={handleReset} />;
                  case 'history':
                      return <HistoryScreen history={history} onView={handleViewHistoryEntry} onDelete={handleDeleteHistory} onClear={handleClearHistory} onBack={() => setScreen('home')} />;
                  case 'home':
                  default:
                      return <HomeScreen onStart={handleStart} onHistory={() => setScreen('history')} />;
              }
          };

          return (
              <div className="app-container">
                  <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
                    {theme === 'light' ? '🌙' : '☀️'}
                  </button>
                  {renderScreen()}
              </div>
          );
      };

      const container = document.getElementById('root');
      const root = createRoot(container!);
      root.render(<App />);