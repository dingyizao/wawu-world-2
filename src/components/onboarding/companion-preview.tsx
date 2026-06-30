import Image from "next/image";

import { getMbtiProfile } from "../../domain/mbti";
import type { MbtiType } from "../../domain/types";

export function CompanionPreview({
  avatarType,
  personalityType,
}: {
  avatarType: MbtiType;
  personalityType: MbtiType;
}) {
  const personality = getMbtiProfile(personalityType);

  return (
    <section className="companion-preview">
      <div className="companion-preview__portrait">
        <Image
          alt={`${avatarType} 外观的分身预览`}
          fill
          priority
          sizes="220px"
          src={`/assets/generated/avatars/${avatarType.toLowerCase()}-portrait.png`}
        />
      </div>
      <div>
        <span className="eyebrow">性格内核 · {personality.type}</span>
        <h2>{personality.label}</h2>
        <p>{personality.description}</p>
        <div className="tag-row">
          {personality.personaTags.map((tag) => (
            <span className="persona-tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
