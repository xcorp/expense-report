import React from 'react';

const ThemeToggle: React.FC = () => {
    const [dark, setDark] = React.useState(false);

// On mount, sync with localStorage or system preference

