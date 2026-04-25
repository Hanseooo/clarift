import { describe, it, expect } from "vitest";
import { render, screen } from '@testing-library/react';
import { MermaidBlock } from '../mermaid-block';
import "@testing-library/jest-dom";

describe('MermaidBlock', () => {
  it('renders without crashing', () => {
    render(<MermaidBlock chart="graph TD; A-->B;" />);
    // The diagram renders asynchronously; just verify container exists
    expect(document.querySelector('[class*="my-4"]')).toBeInTheDocument();
  });
});
