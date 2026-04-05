'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { blogPosts } from '@/lib/mock-data';
import type { BlogPost } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Tag,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';

const allCategories = ['Alle', ...Array.from(new Set(blogPosts.map((p) => p.category)))];
const allTags = Array.from(new Set(blogPosts.flatMap((p) => p.tags)));

export function BlogPage() {
  const { language, selectedArticleId, setSelectedArticleId } = useCargoBitStore();
  const [activeCategory, setActiveCategory] = useState('Alle');

  const filteredPosts = activeCategory === 'Alle'
    ? blogPosts
    : blogPosts.filter((p) => p.category === activeCategory);

  const selectedPost = blogPosts.find((p) => p.id === selectedArticleId);

  if (selectedPost) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 sm:p-6 space-y-6"
      >
        <Button variant="ghost" onClick={() => setSelectedArticleId(null)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          {t('back', language)}
        </Button>

        <div className="max-w-3xl mx-auto">
          {/* Cover Image */}
          <div className="relative rounded-2xl overflow-hidden h-64 sm:h-80 mb-6">
            <Image
              src={selectedPost.coverImage}
              alt={selectedPost.title}
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <Badge className="bg-orange-500 text-white border-0 mb-3">{selectedPost.category}</Badge>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{selectedPost.title}</h1>
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 flex-wrap">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {selectedPost.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {selectedPost.publishedAt}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {selectedPost.readTime} {t('readTime', language)}
            </span>
          </div>

          {/* Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-lg font-medium leading-relaxed text-foreground/90 mb-4">
              {selectedPost.excerpt}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {selectedPost.content}
            </p>
          </div>

          <Separator className="my-8" />

          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-4 h-4 text-muted-foreground" />
            {selectedPost.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('blog', language)}</h1>
        <p className="text-sm text-muted-foreground">
          {language === 'de' ? 'Neuigkeiten und Einblicke aus der Logistikbranche' : 'News and insights from the logistics industry'}
        </p>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {allCategories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            size="sm"
            className={activeCategory === cat
              ? 'bg-orange-500 hover:bg-orange-600 text-white'
              : 'hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-300 dark:hover:border-orange-700/50'
            }
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Blog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-orange-300/50 dark:hover:border-orange-700/30 transition-all duration-300 cursor-pointer overflow-hidden group hover:shadow-lg hover:shadow-orange-500/5 h-full"
              onClick={() => setSelectedArticleId(post.id)}
            >
              {/* Cover Image */}
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                <div className="absolute top-3 left-3">
                  <Badge className="bg-orange-500 text-white border-0 text-[10px]">
                    {post.category}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-5 flex flex-col flex-1">
                <h3 className="font-semibold text-sm leading-tight mb-2 line-clamp-2 group-hover:text-orange-500 transition-colors">
                  {post.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-3 mb-4 flex-1">
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {post.publishedAt}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime} {t('readTime', language)}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
