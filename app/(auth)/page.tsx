import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React from 'react'

const Landing = () => {
  return (
    <div>
      <Link href={"/sign-in"}>
        <Button>sign-in</Button>
      </Link>
      <Link href={"/sign-up"}>
        <Button>sign-up</Button>
      </Link>
    </div>
  );
}

export default Landing
