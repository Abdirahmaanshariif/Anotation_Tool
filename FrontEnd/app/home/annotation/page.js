"use client";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../../../context/UserContext";
const Annotation = () => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("annotationIndex");
      return saved !== null ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sourceSelections, setSourceSelections] = useState([]);
  const [targetSelections, setTargetSelections] = useState([]);
  const [targetCategory, setTargetCategory] = useState("Addition");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMistranslation, setCurrentMistranslation] = useState(null);
  const [openSection, setOpenSection] = useState(null);
  const sliderRef = useRef(null);
  const sourceRef = useRef(null);
  const targetRef = useRef(null);
  const checkboxRef = useRef(null);
  // default rating (used for SSR and initial CSR)
  const [rating, setRating] = useState(50);
  // track hydration
  const [mounted, setMounted] = useState(false);

  const progress = Math.round(((currentIndex + 1) / items.length) * 100);
  // toggle to show tagged output container
  const [showTagged, setShowTagged] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [skiping, setSkipping] = useState(false);

  const [selectedSourceText, setSelectedSourceText] = useState("");
  const [pendingTargetText, setPendingTargetText] = useState("");
  const [pendingTargetRange, setPendingTargetRange] = useState(null);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);

  const [selectionPosition, setSelectionPosition] = useState({
    top: 0,
    left: 0,
  });
  const [startedFromAssignedPage, setStartedFromAssignedPage] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const fromAssigned =
        localStorage.getItem("startedFromAssigned") === "true";
      setStartedFromAssignedPage(fromAssigned);
    }
  }, []);
  const { user } = useStore();
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      router.push("/login");
    }
  }, []);

  const [savedIndices, setSavedIndices] = useState([]);
  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `https://anotationtool-production.up.railway.app/api/annotation/Allannotation`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const saved = await res.json();
        if (!Array.isArray(saved)) {
          console.error("Expected an array but got:", saved);
          return;
        }
        const savedIdxs = saved
          .map((a) => items.findIndex((item) => item.sourceText === a.Src_Text))
          .filter((idx) => idx >= 0);
        setSavedIndices(savedIdxs);
      } catch (e) {
        console.error("Failed to load saved annotations:", e);
      }
    };

    if (items.length > 0) fetchSaved();
  }, [items]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch("https://anotationtool-production.up.railway.app/api/data/annotation");
        if (!res.ok) throw new Error("Network error");

        const data = await res.json();

        const mapped = data.map((post) => ({
          id: post.id,
          sourceText: post.english,
          targetText: post.somali,
        }));
        console.log("Fetched items:", mapped);
        console.log("Saved startId:", localStorage.getItem("startId"));
        setItems(mapped); // ✅ Set first
      } catch (err) {
        console.error("Annotation fetch error:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);
  useEffect(() => {
    const savedSource = localStorage.getItem("startSrc");
    if (items.length > 0 && savedSource) {
      const idx = items.findIndex(
        (item) => item.sourceText?.trim() === savedSource.trim()
      );
      console.log("Matching startSrc:", savedSource);
      console.log("Matched index:", idx);
      setCurrentIndex(idx !== -1 ? idx : 0);
      setStartedFromAssignedPage(true); // ✅ Mark that we started manually
      localStorage.removeItem("startSrc");
      localStorage.removeItem("startedFromAssigned");
    }
  }, [items]);

  useEffect(() => {
    const fetchProgress = async () => {
      if (startedFromAssignedPage) return; // ✅ Skip if started manually

      const token = localStorage.getItem("token");

      try {
        const res = await fetch("https://anotationtool-production.up.railway.app/api/progress", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (data.index !== undefined && !isNaN(data.index)) {
          setCurrentIndex(data.index);
        }
      } catch (err) {
        console.error("Failed to load progress:", err);
      }
    };

    if (items.length > 0) {
      fetchProgress();
    }
  }, [items, startedFromAssignedPage]); // ✅ also watch this flag

  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem("totalAnnotations", items.length.toString());
    }
  }, [items]);
  // 2) Reset selections whenever currentIndex changes
  useEffect(() => {
    setSourceSelections([]);
    setTargetSelections([]);
  }, [currentIndex]);

  // 3) on mount, load stored rating and mark mounted
  useEffect(() => {
    const saved = localStorage.getItem("meaningRating");
    if (saved !== null) {
      setRating(parseInt(saved, 10));
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("meaningRating", rating.toString());
    }
  }, [rating, mounted]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("annotationIndex", currentIndex.toString());
    }
  }, [currentIndex]);
  const getNextMissing = (savedArr, totalItems) => {
    const all = Array.from({ length: totalItems }, (_, i) => i);
    const missing = all.filter((i) => !savedArr.includes(i));
    return missing.length > 0 ? missing[0] : null;
  };
  const handleSave = async () => {
    if (submitting) return;
    setSubmitting(true);

    // 1) Prepare counts & payload
    const counts = countAnnotations();
    const payload = {
      Comment: comment,
      Src_Text: sourceText,
      Score: rating,
      Omission: counts.Omission,
      Addition: counts.Addition,
      Mistranslation: counts.Mistranslation,
      Untranslation: counts.Untranslation,
      Src_Issue: getTaggedText(sourceText, sourceSelections),
      Target_Issue: getTaggedText(targetText, targetSelections),
    };

    try {
      const token = localStorage.getItem("token");

      // 2) Save annotation to backend
      const res = await fetch(
        "https://anotationtool-production.up.railway.app/api/annotation/Addannotation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 409) {
          alert(
            "An annotation already exists for this input. Please modify it."
          );
        } else {
          console.error(
            `Save failed: ${res.status} ${res.statusText} - ${text}`
          );
          alert("Failed to save annotation. Please try again.");
        }
        return;
      }
      await res.json();

      // 3) Clear UI state
      clearSelections();

      // 4) Build the new savedIndices array synchronously
      const newSaved = [...savedIndices, currentIndex];
      setSavedIndices(newSaved);

      // 5) Compute the next index from newSaved
      const next = getNextMissing(newSaved, items.length);

      // 6) Advance or finish
      if (next !== null) {
        setCurrentIndex(next);

        // 7) Persist progress to backend
        await fetch("https://anotationtool-production.up.railway.app/api/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ index: next }),
        });
      } else {
        alert("🎉 You've completed all annotations!");
      }

      // 8) Cleanup
      setComment("");
      setRating(0);
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("Something went wrong. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };
  const handleSkip = async () => {
    if (skiping) return;
    setSkipping(true);

    try {
      const token = localStorage.getItem("token");
      const currentItem = items[currentIndex];

      if (!currentItem) {
        alert("No more items to skip.");
        return;
      }

      const Src_Text = currentItem.sourceText;

      if (!Src_Text) {
        alert("Source text is missing.");
        return;
      }

      const res = await fetch("https://anotationtool-production.up.railway.app/api/annotation/skip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ Src_Text }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`Skip failed: ${res.status} ${res.statusText} - ${text}`);
        alert("Failed to skip annotation. Please try again.");
        return;
      }

      await res.json();

      const newSaved = [...new Set([...savedIndices, currentIndex])];
      setSavedIndices(newSaved);

      const next = getNextMissing(newSaved, items.length);

      if (next !== null) {
        setCurrentIndex(next);

        const progressRes = await fetch("https://anotationtool-production.up.railway.app/api/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ index: next }),
        });

        if (!progressRes.ok) {
          console.warn("Failed to save skip progress.");
        }
      } else {
        alert("🎉 You've completed all annotations!");
      }

      setComment("");
      setRating(0);
      clearSelections();
    } catch (err) {
      console.error("Unexpected skip error:", err);
      alert("Something went wrong while skiping. Please try again later.");
    } finally {
      setSkipping(false);
    }
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        checkboxRef.current &&
        !checkboxRef.current.contains(event.target) &&
        targetRef.current &&
        !targetRef.current.contains(event.target)
      ) {
        setShowCategoryOptions(false); // Update your state to hide the checkbox
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded-md skeleton mb-4"></div>
          <div className="h-4 bg-gray-200 rounded-md skeleton mb-2"></div>
          <div className="h-4 bg-gray-200 rounded-md skeleton mb-2"></div>
          <div className="h-4 bg-gray-200 rounded-md skeleton"></div>
        </div>
      </div>
    );
  }
  if (error) return <p>Error loading items: {error.message}</p>;
  if (!items.length) return <p>No items to annotate.</p>;

  const { id, sourceText, targetText } = items[currentIndex];
  const countAnnotations = () => {
    const counts = {
      Omission: sourceSelections.filter(
        (s) => !s.category || s.category === "Omission"
      ).length,
      Addition: targetSelections.filter((s) => s.category === "Addition")
        .length,
      Untranslation: targetSelections.filter(
        (s) => s.category === "Untranslation"
      ).length,
      Mistranslation: targetSelections.filter(
        (s) => s.category === "Mistranslation"
      ).length,
    };
    return counts;
  };
  const getTaggedText = (txt, sels) => {
    if (!sels.length) return txt;

    const tagMap = {
      Addition: "a",
      Untranslation: "u",
      Mistranslation: "m",
      Omission: "o",
    };

    const sorted = [...sels].sort((a, b) => a.start - b.start);

    let out = "";
    let idx = 0;

    sorted.forEach((s) => {
      if (
        typeof s.start !== "number" ||
        typeof s.end !== "number" ||
        s.start < idx
      )
        return;

      const tag = tagMap[s.category || "Omission"];
      out += txt.slice(idx, s.start); // untagged part
      out += `<${tag}>${txt.slice(s.start, s.end)}</${tag}>`;
      idx = s.end;
    });

    out += txt.slice(idx); // any trailing untagged text
    return out;
  };

  const handleChange = (e) => setRating(parseInt(e.target.value, 10));
  const clearSelections = () => {
    setSourceSelections([]);
    setTargetSelections([]);
  };
  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  function getAbsoluteOffset(container, node, offset) {
    const range = document.createRange();
    range.selectNodeContents(container);
    range.setEnd(node, offset);
    return range.toString().length;
  }

  const resetModal = () => {
    setIsModalOpen(false);
    setCurrentMistranslation(null);
    setPendingTargetText("");
    setShowCategoryOptions(false);
  };

  // const handleSelection = (
  //   setSelections,
  //   text,
  //   category = null,
  //   ref = null
  // ) => {
  //   try {
  //     const selection = window.getSelection();
  //     if (!selection || selection.rangeCount === 0) return;

  //     const selectedText = selection.toString().trim();
  //     if (!selectedText || !ref?.current?.textContent?.includes(selectedText)) {
  //       selection.removeAllRanges();
  //       return;
  //     }

  //     // 1. Estimate selection start index using DOM range
  //     const range = selection.getRangeAt(0);
  //     const preRange = document.createRange();
  //     preRange.selectNodeContents(ref.current);
  //     preRange.setEnd(range.startContainer, range.startOffset);
  //     const approxStart = preRange.toString().length;

  //     // 2. Find all occurrences of the selected text
  //     const content = ref.current.textContent;
  //     const occurrences = [];
  //     let idx = content.indexOf(selectedText);
  //     while (idx !== -1) {
  //       occurrences.push(idx);
  //       idx = content.indexOf(selectedText, idx + 1);
  //     }

  //     // 3. Pick the closest match to where the user selected
  //     if (occurrences.length === 0) {
  //       selection.removeAllRanges();
  //       return;
  //     }

  //     const start = occurrences.reduce((prev, curr) =>
  //       Math.abs(curr - approxStart) < Math.abs(prev - approxStart)
  //         ? curr
  //         : prev
  //     );
  //     const end = start + selectedText.length;

  //     if (start < 0 || end > content.length) {
  //       selection.removeAllRanges();
  //       return;
  //     }

  //     // 4. Handle category menu (for target selections)
  //     if (setSelections === setTargetSelections) {
  //       setPendingTargetText(selectedText);
  //       setShowCategoryOptions(true);
  //       const rect = range.getBoundingClientRect();
  //       setSelectionPosition({
  //         top: rect.bottom + window.scrollY + 10,
  //         left: rect.left + window.scrollX,
  //       });
  //       selection.removeAllRanges();
  //       return;
  //     }

  //     // 5. Update selection state
  //     setSelections((prev) => {
  //       const isMistranslation = category === "Mistranslation";

  //       // Deselect existing selection
  //       const matchIndex = prev.findIndex(
  //         (s) =>
  //           s.start === start &&
  //           s.end === end &&
  //           s.text === selectedText &&
  //           s.category === category
  //       );

  //       if (matchIndex !== -1) {
  //         if (isMistranslation) {
  //           const linkedTargetText = prev[matchIndex].linkedTargetText;
  //           setTargetSelections((targetPrev) =>
  //             targetPrev.filter(
  //               (t) =>
  //                 t.text !== linkedTargetText || t.category !== "Mistranslation"
  //             )
  //           );
  //         }
  //         return prev.filter((_, i) => i !== matchIndex); // Deselect
  //       }

  //       // Prevent overlapping selections
  //       const overlaps = prev.some(
  //         ({ start: sStart, end: sEnd }) => start < sEnd && end > sStart
  //       );
  //       if (overlaps) return prev;

  //       // Add new selection
  //       return [...prev, { text: selectedText, category, start, end }];
  //     });

  //     selection.removeAllRanges();
  //   } catch (err) {
  //     console.error("Error during text selection:", err);
  //     window.getSelection()?.removeAllRanges();
  //   }
  // };

  // const handleCategoryConfirm = (cat) => {
  //   if (!pendingTargetText) return;

  //   const start = targetText.indexOf(pendingTargetText);
  //   const end = start + pendingTargetText.length;

  //   const overlaps = targetSelections.some(
  //     ({ text, start: sStart, end: sEnd }) => {
  //       return text !== pendingTargetText && !(end <= sStart || start >= sEnd);
  //     }
  //   );

  //   if (overlaps) {
  //     alert(`"${pendingTargetText}" overlaps with another selection.`);
  //     setPendingTargetText("");
  //     setShowCategoryOptions(false);
  //     return;
  //   }

  //   const existingIndex = targetSelections.findIndex(
  //     (s) => s.text === pendingTargetText
  //   );
  //   if (existingIndex !== -1) {
  //     const existing = targetSelections[existingIndex];
  //     if (existing.category === cat) {
  //       setTargetSelections((prev) =>
  //         prev.filter((_, i) => i !== existingIndex)
  //       );
  //     } else if (cat === "Mistranslation") {
  //       setTargetSelections((prev) =>
  //         prev.filter((_, i) => i !== existingIndex)
  //       );
  //       setIsModalOpen(true);
  //       setCurrentMistranslation({
  //         text: pendingTargetText,
  //         category: "Mistranslation",
  //         start,
  //         end,
  //       });
  //     } else {
  //       const updated = [...targetSelections];
  //       updated[existingIndex] = {
  //         text: pendingTargetText,
  //         category: cat,
  //         start,
  //         end,
  //       };
  //       setTargetSelections(updated);
  //     }
  //   } else {
  //     if (cat === "Mistranslation") {
  //       setIsModalOpen(true);
  //       setCurrentMistranslation({
  //         text: pendingTargetText,
  //         category: "Mistranslation",
  //         start,
  //         end,
  //       });
  //     } else {
  //       setTargetSelections((prev) => [
  //         ...prev,
  //         { text: pendingTargetText, category: cat, start, end },
  //       ]);
  //     }
  //   }

  //   setPendingTargetText("");
  //   setShowCategoryOptions(false);
  // };
  const handleSelection = (
    setSelections,
    text,
    category = null,
    ref = null
  ) => {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const selectedText = selection.toString().trim();
      if (!selectedText || !ref?.current?.textContent?.includes(selectedText)) {
        selection.removeAllRanges();
        return;
      }

      const range = selection.getRangeAt(0);
      const preRange = document.createRange();
      preRange.selectNodeContents(ref.current);
      preRange.setEnd(range.startContainer, range.startOffset);
      const approxStart = preRange.toString().length;

      const content = ref.current.textContent;
      const occurrences = [];
      let idx = content.indexOf(selectedText);
      while (idx !== -1) {
        occurrences.push(idx);
        idx = content.indexOf(selectedText, idx + 1);
      }

      if (occurrences.length === 0) {
        selection.removeAllRanges();
        return;
      }

      const start = occurrences.reduce((prev, curr) =>
        Math.abs(curr - approxStart) < Math.abs(prev - approxStart)
          ? curr
          : prev
      );
      const end = start + selectedText.length;

      if (start < 0 || end > content.length) {
        selection.removeAllRanges();
        return;
      }

      if (setSelections === setTargetSelections) {
        setPendingTargetText(selectedText);
        setPendingTargetRange({ start, end }); // ✅ Store exact range
        setShowCategoryOptions(true);
        const rect = range.getBoundingClientRect();
        setSelectionPosition({
          top: rect.bottom + window.scrollY + 10,
          left: rect.left + window.scrollX,
        });
        selection.removeAllRanges();
        return;
      }

      setSelections((prev) => {
        const matchIndex = prev.findIndex(
          (s) =>
            s.start === start &&
            s.end === end &&
            s.text === selectedText &&
            s.category === category
        );

        if (matchIndex !== -1) {
          return prev.filter((_, i) => i !== matchIndex);
        }

        const overlaps = prev.some(
          ({ start: sStart, end: sEnd }) => start < sEnd && end > sStart
        );
        if (overlaps) return prev;

        return [...prev, { text: selectedText, category, start, end }];
      });

      selection.removeAllRanges();
    } catch (err) {
      console.error("Error during text selection:", err);
      window.getSelection()?.removeAllRanges();
    }
  };
  const handleCategoryConfirm = (cat) => {
    if (!pendingTargetText || !pendingTargetRange) return;
    const { start, end } = pendingTargetRange;

    const overlaps = targetSelections.some(
      ({ text, start: sStart, end: sEnd }) =>
        text !== pendingTargetText && !(end <= sStart || start >= sEnd)
    );
    if (overlaps) {
      alert(`"${pendingTargetText}" overlaps with another selection.`);
      setPendingTargetText("");
      setPendingTargetRange(null);
      setShowCategoryOptions(false);
      return;
    }

    const existingIndex = targetSelections.findIndex(
      (s) => s.text === pendingTargetText
    );
    if (existingIndex !== -1) {
      const existing = targetSelections[existingIndex];
      if (existing.category === cat) {
        setTargetSelections((prev) =>
          prev.filter((_, i) => i !== existingIndex)
        );
      } else if (cat === "Mistranslation") {
        setTargetSelections((prev) =>
          prev.filter((_, i) => i !== existingIndex)
        );
        setIsModalOpen(true);
        setCurrentMistranslation({
          text: pendingTargetText,
          category: "Mistranslation",
          start,
          end,
        });
      } else {
        const updated = [...targetSelections];
        updated[existingIndex] = {
          text: pendingTargetText,
          category: cat,
          start,
          end,
        };
        setTargetSelections(updated);
      }
    } else {
      if (cat === "Mistranslation") {
        setIsModalOpen(true);
        setCurrentMistranslation({
          text: pendingTargetText,
          category: "Mistranslation",
          start,
          end,
        });
      } else {
        setTargetSelections((prev) => [
          ...prev,
          { text: pendingTargetText, category: cat, start, end },
        ]);
      }
    }

    setPendingTargetText("");
    setPendingTargetRange(null); // ✅ Clear range after use
    setShowCategoryOptions(false);
  };

  const handleSourceSelection = () => {
    const selection = window.getSelection();
    const selectionText = selection.toString().trim();

    if (
      selectionText &&
      sourceText.includes(selectionText) &&
      currentMistranslation
    ) {
      const start = sourceText.indexOf(selectionText);
      const end = start + selectionText.length;

      // 🔁 Deselect if Mistranslation already exists
      const existingIndex = sourceSelections.findIndex(
        (s) =>
          s.category === "Mistranslation" &&
          s.start === start &&
          s.end === end &&
          s.text === selectionText
      );

      if (existingIndex !== -1) {
        const linkedTarget = sourceSelections[existingIndex].linkedTargetText;
        setSourceSelections((prev) =>
          prev.filter((_, i) => i !== existingIndex)
        );
        setTargetSelections((prev) =>
          prev.filter(
            (t) => !(t.text === linkedTarget && t.category === "Mistranslation")
          )
        );
        resetModal();
        return;
      }

      // ❌ Remove overlapping Omission
      setSourceSelections((prev) =>
        prev.filter(
          (s) =>
            !(s.category === "Omission" && !(end <= s.start || start >= s.end))
        )
      );

      // ❌ Remove any overlapping Mistranslation in source (for update case)
      setSourceSelections((prev) =>
        prev.filter(
          (s) =>
            !(
              s.category === "Mistranslation" &&
              !(end <= s.start || start >= s.end)
            )
        )
      );

      // ✅ Remove related target Mistranslation if present
      setTargetSelections((prev) =>
        prev.filter(
          (t) =>
            !(
              t.category === "Mistranslation" &&
              (t.text === currentMistranslation.text ||
                t.linkedSourceText === selectionText)
            )
        )
      );

      // ❌ Prevent duplicate target side
      const targetAlreadyLinked = targetSelections.some(
        (t) =>
          t.category === "Mistranslation" &&
          (t.text === currentMistranslation.text ||
            t.text.includes(currentMistranslation.text) ||
            currentMistranslation.text.includes(t.text))
      );

      if (targetAlreadyLinked) {
        alert("This Mistranslation pair overlaps with an existing one.");
        resetModal();
        return;
      }

      // ✅ Add new Mistranslation pair
      setSourceSelections((prev) => [
        ...prev,
        {
          text: selectionText,
          category: "Mistranslation",
          linkedTargetText: currentMistranslation.text,
          start,
          end,
        },
      ]);

      setTargetSelections((prev) => [
        ...prev,
        {
          text: currentMistranslation.text,
          category: "Mistranslation",
          linkedSourceText: selectionText,
          start: currentMistranslation.start,
          end: currentMistranslation.end,
        },
      ]);

      resetModal();
    }

    selection.removeAllRanges();
  };

  const getClassAndTooltip = (sel) => {
    if (!sel.category) {
      return {
        colorClass:
          "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 font-semibold px-1 rounded",
        tooltipText: "Omission",
      };
    }

    switch (sel.category) {
      case "Addition":
        return {
          colorClass:
            "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 font-semibold px-1 rounded",
          tooltipText: "Addition",
        };
      case "Untranslation":
        return {
          colorClass:
            "bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 font-semibold px-1 rounded",
          tooltipText: "Untranslation",
        };
      case "Mistranslation":
        return {
          colorClass:
            "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 font-semibold px-1 rounded",
          tooltipText: "Mistranslation",
        };
      default:
        return {
          colorClass:
            "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold px-1 rounded",
          tooltipText: sel.category,
        };
    }
  };

  const renderText = (text, selections) => {
    if (!selections.length) return text;

    const sorted = selections
      .map((sel) => ({
        ...sel,
        ...getClassAndTooltip(sel),
      }))
      .filter((s) => typeof s.start === "number" && typeof s.end === "number")
      .sort((a, b) => a.start - b.start);

    const parts = [];
    let lastIndex = 0;

    sorted.forEach((s, i) => {
      if (s.start > lastIndex) {
        parts.push(
          <span key={`n-${i}`}>{text.slice(lastIndex, s.start)}</span>
        );
      }

      parts.push(
        <span
          key={`h-${i}`}
          className={`${s.colorClass} font-semibold tooltip tooltip-open tooltip-top`}
          data-tip={s.tooltipText}
        >
          {text.slice(s.start, s.end)}
        </span>
      );

      lastIndex = s.end;
    });

    if (lastIndex < text.length) {
      parts.push(<span key="last">{text.slice(lastIndex)}</span>);
    }

    return parts;
  };

  return (
    <>
      <div className="max-w-5xl w-full mx-auto bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 rounded shadow px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex-1 flex flex-col space-y-5">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-3 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center space-x-2">
              <p className="text-sm sm:text-base font-medium text-gray-800 dark:text-gray-200">
                Text ID:{" "}
                <span className="font-semibold">{currentIndex + 1}</span>
              </p>
            </div>
            <progress
              className="progress progress-info w-full sm:w-56 bg-gray-200 dark:bg-gray-800"
              value={progress}
              max="100"
            />
          </div>

          {/* Prompt */}
          <div className="text-center text-xl sm:text-2xl md:text-3xl font-semibold px-2 py-3">
            Does the lower text adequately express the meaning of the upper
            text?
          </div>

          {/* Source & Target */}
          <div className="p-3 w-full">
            <div className="border border-gray-200 dark:border-gray-700 rounded-sm shadow-sm p-4 space-y-8 overflow-x-auto">
              {/* Source Text */}
              <p
                onMouseUp={() =>
                  handleSelection(
                    setSourceSelections,
                    sourceText,
                    "Omission",
                    sourceRef
                  )
                }
                className="break-words"
              >
                <span className="text-xl sm:text-2xl font-semibold">
                  Source Text:
                </span>{" "}
                <span
                  ref={sourceRef}
                  className="block mt-1 text-base sm:text-lg"
                >
                  {renderText(sourceText, sourceSelections)}
                </span>
              </p>

              {/* Category Popup */}
              {showCategoryOptions && (
                <div
                  ref={checkboxRef}
                  className="absolute bg-white dark:bg-gray-800 border dark:border-gray-600 text-black dark:text-white rounded shadow p-2 space-y-2 z-50 w-48"
                  style={{
                    top: `${selectionPosition.top}px`,
                    left: `${selectionPosition.left}px`,
                  }}
                >
                  <p className="text-sm font-semibold">Choose category:</p>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="category"
                      onChange={() => handleCategoryConfirm("Addition")}
                    />
                    <span>Addition</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="category"
                      onChange={() => handleCategoryConfirm("Untranslation")}
                    />
                    <span>Untranslation</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="category"
                      onChange={() => handleCategoryConfirm("Mistranslation")}
                    />
                    <span>Mistranslation</span>
                  </label>
                </div>
              )}

              {/* Target Text */}
              <p
                onMouseUp={() =>
                  handleSelection(
                    setTargetSelections,
                    targetText,
                    targetCategory,
                    targetRef
                  )
                }
                className="break-words"
              >
                <span className="text-xl sm:text-2xl font-semibold">
                  Target Text:
                </span>{" "}
                <span
                  ref={targetRef}
                  className="block mt-1 text-base sm:text-lg"
                >
                  {renderText(targetText, targetSelections)}
                </span>
              </p>
            </div>
          </div>

          {/* Mistranslation Modal */}
          {isModalOpen && (
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setIsModalOpen(false)}
            >
              <div
                className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 rounded-lg shadow-lg w-full max-w-lg sm:max-w-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-semibold mb-4 text-center">
                  Select Mistranslation Text from Source
                </h2>

                <div
                  className="border border-gray-300 dark:border-gray-600 p-4 rounded bg-gray-50 dark:bg-gray-800 max-h-80 overflow-y-auto"
                  onMouseUp={handleSourceSelection}
                >
                  {renderText(sourceText, sourceSelections)}
                </div>

                <div className="mt-4 text-right">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white px-4 py-2 rounded transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          <p className="text-base sm:text-lg font-semibold ml-3 mt-4">
            Selected value: {rating}
          </p>

          {/* Meaning Slider */}
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4 space-y-4">
            {/* Slider Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 font-semibold">
              <span className="text-sm sm:text-base text-center sm:text-left mb-2 sm:mb-0">
                strongly disagree
              </span>

              <div className="relative w-full">
                <input
                  ref={sliderRef}
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={rating}
                  onChange={handleChange}
                  className="range range-primary w-full dark:range-secondary"
                />
                <div className="absolute left-0 right-0 top-6 flex justify-between text-[10px] sm:text-xs text-gray-400 px-1">
                  <span
                    className="tooltip tooltip-open tooltip-bottom"
                    data-tip="Nonsense/No meaning preserved"
                  />
                  <span
                    className="tooltip tooltip-open tooltip-bottom"
                    data-tip="Some meaning preserved"
                  />
                  <span
                    className="tooltip tooltip-open tooltip-bottom"
                    data-tip="Most meaning preserved"
                  />
                  <span
                    className="tooltip tooltip-open tooltip-bottom"
                    data-tip="Perfect meaning"
                  />
                </div>
              </div>

              <span className="text-sm sm:text-base text-center sm:text-right mt-2 sm:mt-0">
                strongly agree
              </span>
            </div>

            {/* Comment Section */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow rounded p-2 mt-10 text-sm sm:text-base resize-none"
              placeholder="Please write any comment about the highlighted errors or annotation"
              rows={4}
            />
          </div>

          {/* Submit Button */}
          <div className="w-full px-4 sm:px-6 lg:px-8 pb-4 flex flex-wrap justify-center gap-4">
            {/* Submit Button */}
            <button
              onClick={handleSave}
              disabled={submitting}
              className={`px-6 py-2 text-sm sm:text-base font-semibold rounded-md shadow transition-all duration-150
      ${
        submitting
          ? "bg-blue-400 cursor-not-allowed text-white"
          : "bg-blue-600 hover:bg-blue-700 text-white"
      }
      dark:bg-blue-700 dark:hover:bg-blue-800 dark:disabled:bg-blue-500
      focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500
    `}
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>

            {/* Skip Button */}
            <button
              onClick={handleSkip}
              disabled={skiping}
              className={`px-6 py-2 text-sm sm:text-base font-semibold rounded-md shadow transition-all duration-150
      ${
        skiping
          ? "bg-yellow-400 cursor-not-allowed text-white"
          : "bg-yellow-500 hover:bg-yellow-600 text-white"
      }
      focus:outline-none focus:ring-2 focus:ring-yellow-300 dark:focus:ring-yellow-500
    `}
            >
              {skiping ? "Skipping..." : "Skip"}
            </button>
          </div>

          {/* MQM Guidelines */}
          <div className="border-t border-b mx-3 dark:border-gray-600 bg-white dark:bg-gray-900">
            <button
              onClick={() => toggleSection("mqm")}
              className="w-full flex items-center justify-between py-3"
            >
              <span className="text-lg font-medium flex items-center">
                MQM Guidelines{" "}
                <ChevronDown
                  className={`${openSection === "mqm" ? "rotate-180" : ""}`}
                  size={20}
                />
              </span>
            </button>
            {openSection === "mqm" && (
              <div className="px-4 pb-4 space-y-3 text-gray-800 dark:text-gray-200">
                <p className="font-semibold text-center">Source text</p>
                <p>
                  <strong>Omission:</strong> The highlighted span in the
                  translation corresponds to information that{" "}
                  <strong>does not exist </strong>in the translated text.
                </p>
                <p>
                  <strong>Mistranslation:</strong> The highlighted span in the
                  source<strong> does not have the exact same meaning</strong>{" "}
                  as the highlighted span in the translation segmen
                </p>
                <p className="font-semibold text-center">Target text</p>
                <p>
                  <strong>Addition:</strong> The highlighted span corresponds to
                  information that<strong> does not exist</strong> in the other
                  segment.
                </p>
                <p>
                  <strong>Mistranslation:</strong> The highlighted span in the
                  source<strong> does not have the exact same meaning</strong>{" "}
                  as the highlighted span in the translation segmen
                </p>
                <p>
                  <strong>Untranslated:</strong> The highlighted span in the
                  translation is a <strong>copy</strong> of the highlighted span
                  in the source segment.
                </p>
              </div>
            )}
          </div>

          {/* DA Guidelines */}
          <div className="border-t border-b mx-3 dark:border-gray-600 bg-white dark:bg-gray-900">
            <button
              onClick={() => toggleSection("da")}
              className="w-full flex items-center justify-between py-3"
            >
              <span className="text-lg font-medium flex items-center">
                DA Guidelines{" "}
                <ChevronDown
                  className={`${openSection === "da" ? "rotate-180" : ""}`}
                  size={20}
                />
              </span>
            </button>
            {openSection === "da" && (
              <div className="px-4 pb-4 space-y-3 text-gray-800 dark:text-gray-200">
                <p>
                  <strong>Nonsense/No meaning preserved:</strong> Nearly all
                  information is lost between the translation and source.
                </p>
                <p>
                  <strong>Some meaning preserved:</strong> The translation
                  preserves some of the meaning of the source but misses
                  significant parts.
                </p>
                <p>
                  <strong>Most meaning preserved:</strong> The translation
                  preserves some of the meaning of the source but misses
                  significant parts.
                </p>
                <p>
                  <strong>Perfect meaning:</strong> The translation preserves
                  some of the meaning of the source but misses significant
                  parts.
                </p>
              </div>
            )}
          </div>

          <p className="mb-6 text-center">
            Texts left to be annotated: {items.length - currentIndex}
          </p>
        </div>
      </div>
    </>
  );
};

export default Annotation;
